import axios from "axios";
import {
  EventSource
} from "eventsource";
import SpoofHead from "@/lib/spoof-head";
class Summyt {
  constructor() {
    this.baseURL = "https://use.summyt.app/api";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://summyt.app",
      priority: "u=1, i",
      referer: "https://summyt.app/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async req(url, data = null, method = "POST", customHeaders = {}) {
    try {
      console.log(`[req] ${method}: ${url.split("/").pop()}`);
      const config = {
        method: method,
        url: url,
        headers: {
          ...this.headers,
          ...customHeaders
        },
        ...data && {
          data: data
        }
      };
      const response = await axios(config);
      console.log("[req] Status:", response.status);
      return response.data;
    } catch (err) {
      console.error("[req] Error:", err.response?.data || err.message);
      throw err;
    }
  }
  extractVideoId(url) {
    try {
      const match = url.match(/(?:v=|\/)([\w-]{11})/);
      return match ? match[1] : url;
    } catch {
      return url;
    }
  }
  async summarize(videoId, options = {}) {
    try {
      console.log("[summarize] Video ID:", videoId);
      const videoIdClean = this.extractVideoId(videoId);
      const data = {
        summaryType: options.summaryType || "BULLET_POINT",
        source: options.source || "landing-page"
      };
      const result = await this.req(`${this.baseURL}/video/${videoIdClean}/summarize`, data);
      console.log("[summarize] Result:", result.type);
      if (result.type === "success") {
        return result.data;
      } else {
        throw new Error(`Summarize failed: ${result.type}`);
      }
    } catch (err) {
      console.error("[summarize] Failed:", err.message);
      throw err;
    }
  }
  subscribe(revisionId, callbacks = {}) {
    return new Promise((resolve, reject) => {
      try {
        console.log("[subscribe] Revision ID:", revisionId);
        const url = `${this.baseURL}/revision/${revisionId}/subscribe`;
        const eventSource = new EventSource(url, {
          headers: {
            ...this.headers,
            accept: "text/event-stream",
            "cache-control": "no-cache"
          }
        });
        let summaryData = {
          metadata: null,
          parts: [],
          completed: false
        };
        eventSource.onopen = () => {
          console.log("[subscribe] SSE Connection opened");
          callbacks.onOpen?.();
        };
        eventSource.onmessage = event => {
          console.log("[subscribe] Raw event:", event);
        };
        eventSource.addEventListener("summaryPart", event => {
          try {
            const data = JSON.parse(event.data);
            console.log("[subscribe] summaryPart:", data.type);
            switch (data.type) {
              case "metadata":
                summaryData.metadata = data;
                callbacks.onMetadata?.(data);
                break;
              case "summaryPart":
                if (data.data && data.data.length > 0) {
                  const rows = data.data[0].rows;
                  if (rows && rows.length > 0 && rows.some(row => row.trim())) {
                    summaryData.parts.push(data);
                    callbacks.onData?.(data);
                  }
                }
                break;
              case "summaryPartDone":
                console.log("[subscribe] Part done:", data.index);
                callbacks.onPartDone?.(data);
                break;
              case "summaryDone":
                console.log("[subscribe] All parts completed");
                summaryData.completed = true;
                callbacks.onDone?.(data);
                eventSource.close();
                resolve(this.formatSummary(summaryData));
                break;
            }
          } catch (parseError) {
            console.error("[subscribe] Parse error:", parseError);
          }
        });
        eventSource.onerror = error => {
          console.error("[subscribe] SSE Error:", error);
          if (eventSource.readyState === EventSource.CLOSED) {
            callbacks.onError?.(error);
            reject(error);
          }
        };
        eventSource.addEventListener("summaryDone", () => {
          eventSource.close();
        });
      } catch (err) {
        console.error("[subscribe] Failed to establish connection:", err);
        reject(err);
      }
    });
  }
  formatSummary(summaryData) {
    const formatted = {
      metadata: summaryData.metadata,
      content: "",
      sections: []
    };
    let currentSection = null;
    summaryData.parts.forEach(part => {
      if (part.data && part.data[0] && part.data[0].rows) {
        part.data[0].rows.forEach(row => {
          if (row && row.trim()) {
            if (row.startsWith("## ") || row.startsWith("# ")) {
              if (currentSection) {
                formatted.sections.push(currentSection);
              }
              currentSection = {
                title: row.replace(/#/g, "").trim(),
                content: "",
                quotes: [],
                points: []
              };
            } else if (row.startsWith("> ")) {
              const quote = row.replace(">", "").trim();
              if (currentSection) {
                currentSection.quotes.push(quote);
              }
              formatted.content += row + "\n";
            } else if (row.startsWith("- ")) {
              const point = row.replace("-", "").trim();
              if (currentSection) {
                currentSection.points.push(point);
              }
              formatted.content += row + "\n";
            } else {
              if (currentSection) {
                currentSection.content += row + "\n";
              }
              formatted.content += row;
            }
          }
        });
      }
    });
    if (currentSection) {
      formatted.sections.push(currentSection);
    }
    return formatted;
  }
  async generate({
    url,
    summaryType = "BULLET_POINT",
    source = "landing-page",
    callbacks = {}
  }) {
    try {
      console.log("[generate] Starting...");
      const videoId = this.extractVideoId(url);
      console.log("[generate] Video ID:", videoId);
      const revisionId = await this.summarize(videoId, {
        summaryType: summaryType,
        source: source
      });
      console.log("[generate] Revision ID:", revisionId);
      const summary = await this.subscribe(revisionId, callbacks);
      console.log("[generate] Completed");
      return {
        videoId: videoId,
        revisionId: revisionId,
        summary: summary
      };
    } catch (err) {
      console.error("[generate] Error:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const client = new Summyt();
    const response = await client.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}