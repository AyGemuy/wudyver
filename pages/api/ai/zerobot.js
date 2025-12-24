import {
  EventSource
} from "eventsource";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class AIClient {
  constructor() {
    this.baseUrl = "https://www.zerobot.ai/dash/functions-v18.php";
    this.defaultHeaders = {
      accept: "text/event-stream",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      priority: "u=1, i",
      referer: "https://www.zerobot.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  genId() {
    return crypto.randomBytes(8).toString("hex");
  }
  genChatId() {
    return crypto.randomUUID?.() || `${this.genId()}-${this.genId()}-${this.genId()}-${this.genId()}`;
  }
  async chat({
    type = "chat",
    prompt,
    ...rest
  }) {
    console.log("Memulai chat dengan type:", type);
    try {
      const chatId = rest.chatId || this.genChatId();
      const agent = rest.agent || `cZtmac8cx`;
      const chatMsgUuid = rest.chatMsgUuid || `msg_${this.genId()}`;
      const baseParams = {
        mode: "",
        agent: agent,
        msg: prompt || "",
        chat_id: chatId,
        chat_msg_uuid: chatMsgUuid,
        thread_id: "____",
        model: this.getModel(type, rest.model),
        input: prompt || "",
        image_url: "",
        image_mode: type === "image" ? "1" : "0"
      };
      const finalParams = {
        ...baseParams,
        ...rest.payload
      };
      Object.keys(finalParams).forEach(key => {
        if (finalParams[key] === undefined || finalParams[key] === null) {
          delete finalParams[key];
        }
      });
      const params = new URLSearchParams(finalParams);
      const url = `${this.baseUrl}?${params}`;
      console.log("URL request:", url);
      console.log("Generated IDs:", {
        chatId: chatId,
        agent: agent,
        chatMsgUuid: chatMsgUuid
      });
      const headers = {
        ...this.defaultHeaders,
        ...rest.headers
      };
      const eventSource = new EventSource(url, {
        headers: headers
      });
      const result = {
        content: "",
        status: "",
        provider: "",
        messageUuid: "",
        chatDbId: "",
        fullResponse: "",
        imageUrl: "",
        sources: [],
        deltas: [],
        debug: "",
        events: [],
        generatedIds: {
          chatId: chatId,
          agent: agent,
          chatMsgUuid: chatMsgUuid
        }
      };
      return new Promise((resolve, reject) => {
        let eventCount = 0;
        const eventHandler = event => {
          eventCount++;
          try {
            const eventData = this.parseEventData(event.data);
            const eventInfo = {
              type: event.type,
              data: eventData,
              timestamp: new Date().toISOString(),
              sequence: eventCount
            };
            result.events.push(eventInfo);
            this.handleEvent(event.type, eventData, result);
            console.log(`Event [${eventCount}] ${event.type}:`, eventData?.content?.substring?.(0, 50) || eventData?.delta?.substring?.(0, 50) || eventData?.status?.substring?.(0, 50) || JSON.stringify(eventData).substring(0, 100));
          } catch (error) {
            console.log(`Error parsing event [${eventCount}]:`, error?.message);
            result.events.push({
              type: event.type,
              data: event.data,
              error: error?.message,
              timestamp: new Date().toISOString(),
              sequence: eventCount
            });
          }
        };
        eventSource.onmessage = eventHandler;
        ["status", "provider_info", "chat_msg_uuid", "message", "chat_db_id", "chat_title", "fullResponse", "done", "error"].forEach(eventType => {
          eventSource.addEventListener(eventType, eventHandler);
        });
        eventSource.onerror = error => {
          console.log("EventSource error:", error);
          result.lastError = error?.message || "Unknown error";
          eventSource.close();
          reject(new Error(`EventSource error: ${result.lastError}`));
        };
        eventSource.addEventListener("done", event => {
          console.log("Stream selesai. Total events:", eventCount);
          this.finalizeResult(result);
          eventSource.close();
          resolve(result);
        });
        const timeout = setTimeout(() => {
          if (!result.content && eventCount === 0) {
            console.log("Timeout - tidak ada event diterima");
            eventSource.close();
            reject(new Error("Timeout: Tidak ada response dari server"));
          }
        }, rest.timeout || 3e4);
        eventSource.addEventListener("done", () => clearTimeout(timeout));
        eventSource.onerror = () => clearTimeout(timeout);
      });
    } catch (error) {
      console.log("Error dalam chat:", error?.message);
      throw error;
    }
  }
  parseEventData(data) {
    if (!data) return null;
    try {
      if (typeof data === "object") return data;
      if (data.startsWith("{") || data.startsWith("[")) {
        return JSON.parse(data);
      }
      return {
        content: data
      };
    } catch (error) {
      return {
        raw: data,
        error: error?.message
      };
    }
  }
  handleEvent(eventType, data, result) {
    if (!data) return;
    switch (eventType) {
      case "status":
        result.status = data?.status || result.status;
        break;
      case "provider_info":
        result.provider = data?.friendly_name || data?.provider || result.provider;
        break;
      case "chat_msg_uuid":
        result.messageUuid = data?.msgUuid || result.messageUuid;
        break;
      case "message":
        this.handleMessageEvent(data, result);
        break;
      case "chat_db_id":
        result.chatDbId = data?.chatDbId?.toString() || result.chatDbId;
        break;
      case "chat_title":
        result.chatTitle = data?.chatTitle || result.chatTitle;
        result.isTitleComplete = data?.isComplete || result.isTitleComplete;
        break;
      case "fullResponse":
        result.fullResponse = data?.fullResponse || result.fullResponse;
        break;
      case "debug":
        result.debug = data?.debug || data?.content || result.debug;
        break;
      default:
        if (data?.content) {
          result.content += data.content;
        }
        if (data?.delta) {
          result.deltas.push(data.delta);
          result.content += data.delta;
        }
    }
  }
  handleMessageEvent(data, result) {
    if (data?.content && data?.action === "append") {
      result.content += data.content;
      return;
    }
    if (data?.delta) {
      result.deltas.push(data.delta);
      result.content += data.delta;
      return;
    }
    if (data?.content) {
      result.content += data.content;
      const imageMatch = data.content.match(/!\[\]\((https?:\/\/[^)]+)\)/);
      if (imageMatch?.[1]) {
        result.imageUrl = imageMatch[1];
      }
      if (data.content.includes("sources") || data.sources) {
        try {
          const sourcesData = data.sources || data.content;
          const sourcesMatch = sourcesData.match(/\[.*\]/);
          if (sourcesMatch) {
            result.sources = JSON.parse(sourcesMatch[0].replace(/\\\//g, "/"));
          }
        } catch (error) {
          console.log("Error parsing sources:", error?.message);
        }
      }
    }
    if (data?.debug) {
      result.debug = data.debug;
    }
  }
  finalizeResult(result) {
    result.content = result.content.trim();
    if (result.fullResponse) {
      result.content = result.fullResponse;
    }
    if (result.deltas.length > 0 && !result.content) {
      result.content = result.deltas.join("");
    }
    if (!result.imageUrl && result.content) {
      const imageMatch = result.content.match(/!\[\]\((https?:\/\/[^)]+)\)/);
      if (imageMatch?.[1]) {
        result.imageUrl = imageMatch[1];
      }
    }
    if (result.imageUrl) {
      result.imageUrl = result.imageUrl.replace(/\\\//g, "/");
    }
    result.stats = {
      totalEvents: result.events.length,
      contentLength: result.content.length,
      deltaCount: result.deltas.length,
      sourceCount: result.sources.length
    };
  }
  getModel(type, customModel) {
    if (customModel) return customModel;
    const models = {
      image: "Google-Gemini-Flash",
      chat: "ZeroBotMagic",
      search: "Sonar"
    };
    return models[type] || "ZeroBotMagic";
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
    const api = new AIClient();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}