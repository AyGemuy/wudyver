import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class BraveSearchAPI {
  constructor() {
    this.baseURL = "https://search.brave.com";
    this.cookies = new Map();
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 6e4,
      maxRedirects: 10,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.api.interceptors.response.use(r => (r.headers["set-cookie"] && this.updC(r.headers["set-cookie"]), r), e => Promise.reject(e));
    this.api.interceptors.request.use(c => (this.cookies.size > 0 && (c.headers["Cookie"] = Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join("; ")), c), e => Promise.reject(e));
  }
  _parse(raw) {
    const texts = [];
    const jsons = {};
    const lines = raw.split("\n");
    let buffer = [];
    let inMultiLineString = false;
    lines.forEach(line => {
      const trimL = line.trim();
      if (!trimL && inMultiLineString) {
        buffer.push("");
        return;
      }
      if (!trimL) return;
      if (trimL.startsWith('"') && !trimL.endsWith('"') || !trimL.startsWith('"') && trimL.endsWith('"')) {
        inMultiLineString = !inMultiLineString;
      }
      buffer.push(trimL);
      if (!inMultiLineString) {
        const combinedLine = buffer.join("\n");
        buffer = [];
        try {
          let parsed = JSON.parse(combinedLine);
          if (typeof parsed === "object" && parsed !== null) {
            if (parsed.type?.length > 0) {
              (jsons[parsed.type] = jsons[parsed.type] || []).push(parsed);
            } else {
              texts.push(JSON.stringify(parsed, null, 2));
            }
          } else if (typeof parsed === "string") {
            texts.push(parsed);
          } else {
            texts.push(String(parsed));
          }
        } catch (e) {
          if (combinedLine.startsWith('"') && combinedLine.endsWith('"')) {
            try {
              texts.push(combinedLine.slice(1, -1));
            } catch (e2) {
              texts.push(combinedLine);
            }
          } else {
            texts.push(combinedLine);
          }
        }
      }
    });
    if (buffer.length > 0) {
      texts.push(buffer.join("\n"));
    }
    return {
      result: texts.join(""),
      ...jsons
    };
  }
  unescapeString(str) {
    if (typeof str !== "string") {
      str = String(str);
    }
    if (str.startsWith('"') && str.endsWith('"')) {
      try {
        return JSON.parse(str);
      } catch (e) {}
    }
    return str.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\b/g, "\b").replace(/\\f/g, "\f").replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, "\\").replace(/\n+/g, "\n").trim();
  }
  updC(hdrs) {
    try {
      hdrs.forEach(cookie => {
        const match = cookie.match(/^([^=]+)=([^;]+)/);
        if (match) this.cookies.set(match[1].trim(), match[2].trim());
      });
      console.log("[BRAVE] Cookies updated.");
    } catch (e) {
      console.error("[BRAVE] Error updating cookies:", e.message);
    }
  }
  async srch(query, opts = {}) {
    try {
      console.log(`[BRAVE] Initial search for: "${query}"`);
      const res = await this.api.get("/search", {
        params: {
          q: query,
          source: "llmSuggest",
          summary: "1",
          ...opts
        }
      });
      const {
        chatllmData,
        conversationId
      } = this.extD(res.data);
      if (!chatllmData || !conversationId) throw new Error("Failed to extract chatllm data or conversation ID.");
      console.log(`[BRAVE] Extracted chatllm data: ${chatllmData ? "SUCCESS" : "FAILED"}`);
      console.log(`[BRAVE] Extracted conversation ID: ${conversationId}`);
      return {
        chatllmData: chatllmData,
        conversationId: conversationId
      };
    } catch (e) {
      console.error(`[BRAVE] Initial search error: ${e.message}`);
      throw new Error(`Initial search failed: ${e.message}`);
    }
  }
  extD(html) {
    let match;
    const regex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    while ((match = regex.exec(html)) !== null) {
      const content = match[1];
      if (content.includes("chatllm:")) {
        let cursor = content.indexOf("chatllm:");
        let area = content.substring(cursor);
        const keyM = area.match(/key:\s*"((?:[^"\\]|\\.)*)"/);
        if (!keyM) continue;
        const key = this.unescapeString(keyM[1]);
        cursor += keyM.index + keyM[0].length;
        area = content.substring(cursor);
        const queryM = area.match(/query:\s*"((?:[^"\\]|\\.)*)"/);
        if (!queryM) continue;
        const query = this.unescapeString(queryM[1]);
        cursor += queryM.index + queryM[0].length;
        area = content.substring(cursor);
        const nonceM = area.match(/nonce:\s*"([^"]*)"/);
        const nonce = nonceM ? nonceM[1] : null;
        if (nonceM) cursor += nonceM.index + nonceM[0].length;
        area = content.substring(cursor);
        const convM = area.match(/conversation:\s*"([^"]*)"/);
        if (!convM) continue;
        const convId = convM[1];
        return {
          chatllmData: {
            type: "chatllm",
            key: key,
            query: query,
            nonce: nonce
          },
          conversationId: convId
        };
      }
    }
    console.warn("[BRAVE] No chatllm data or conversation ID found.");
    return {
      chatllmData: null,
      conversationId: null
    };
  }
  async chat({
    prompt,
    conversationId = null,
    rich = true,
    country = "id",
    followup = null,
    index = 1,
    ...rest
  }) {
    try {
      console.log(`\n--- CHAT START ---`);
      let currentConversationId = conversationId;
      let chatllmKey = null;
      if (!currentConversationId || !prompt) {
        if (!prompt) {
          throw new Error("Prompt is required for initial search or if no conversationId is provided.");
        }
        const {
          chatllmData,
          conversationId: newConvId
        } = await this.srch(prompt, {
          country: country,
          ...rest
        });
        currentConversationId = newConvId;
        chatllmKey = typeof chatllmData.key === "string" ? this.unescapeString(chatllmData.key) : chatllmData.key;
      } else {
        console.warn("[BRAVE] Reusing existing conversationId. Ensure 'key' is handled correctly if not derived from initial search.");
      }
      const combinedResult = {};
      try {
        console.log(`[BRAVE] Fetching suggest data for "${prompt}"...`);
        const suggestRes = await this.api.get("/api/suggest", {
          params: {
            q: prompt,
            rich: rich,
            source: "web",
            country: country
          }
        });
        if (suggestRes.status === 200 && suggestRes.data) {
          combinedResult.suggest = suggestRes.data;
        } else {
          console.warn("[BRAVE] No suggest data or received empty response.");
        }
      } catch (e) {
        console.error(`[BRAVE] Error fetching suggest data: ${e.message}`);
      }
      if (chatllmKey && currentConversationId) {
        try {
          console.log(`[BRAVE] Fetching chatllm data...`);
          const chatllmRes = await this.api.get("/api/chatllm", {
            params: {
              key: chatllmKey,
              conversation: currentConversationId,
              ...rest
            }
          });
          if (chatllmRes.status === 200 && chatllmRes.data) {
            combinedResult.chatllm = this._parse(chatllmRes.data);
          } else {
            console.warn("[BRAVE] No chatllm data or received empty response.");
          }
        } catch (e) {
          console.error(`[BRAVE] Error fetching chatllm data: ${e.message}`);
        }
        try {
          console.log(`[BRAVE] Fetching enrichments data...`);
          const enrichmentsRes = await this.api.get("/api/chatllm/enrichments", {
            params: {
              key: chatllmKey,
              conversation: currentConversationId,
              ...rest
            }
          });
          if (enrichmentsRes.status === 200 && enrichmentsRes.data) {
            combinedResult.enrichments = enrichmentsRes.data;
          } else {
            console.warn("[BRAVE] No enrichments data or received empty response.");
          }
        } catch (e) {
          console.error(`[BRAVE] Error fetching enrichments data: ${e.message}`);
        }
        if (followup) {
          try {
            console.log(`[BRAVE] Fetching conversation data for followup "${followup}" (index: ${index})...`);
            const conversationRes = await this.api.get("/api/chatllm/conversation", {
              params: {
                key: chatllmKey,
                conversation: currentConversationId,
                index: index,
                followup: followup,
                ...rest
              }
            });
            if (conversationRes.status === 200 && conversationRes.data) {
              combinedResult.conversation = this._parse(conversationRes.data);
            } else {
              console.warn("[BRAVE] No conversation data or received empty response for followup.");
            }
          } catch (e) {
            console.error(`[BRAVE] Error fetching conversation data: ${e.message}`);
          }
        } else {
          console.log("[BRAVE] No followup query provided for conversation endpoint.");
        }
      } else {
        console.warn("[BRAVE] Skipping chatllm, enrichments, and conversation calls because chatllmKey or conversationId is missing after initial search or not provided.");
      }
      console.log(`--- CHAT END ---\n`);
      return combinedResult;
    } catch (e) {
      console.error(`[BRAVE] Chat error: ${e.message}`);
      console.error(`--- CHAT FAILED ---\n`);
      throw new Error(`Chat failed: ${e.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const ai = new BraveSearchAPI();
    const response = await ai.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}