import CryptoJS from "crypto-js";
import axios from "axios";
import crypto from "crypto";
class AIChat {
  constructor() {
    this.LLM_MARKER = "__LLM_RESPONSE__";
    this.QUESTIONS_MARKER = "__RELATED_QUESTIONS__";
    this.BASE_URL = "https://xdash.ai";
    this.limiter = this.createLimiter(6e3, 2, 1);
    this.axios = axios.create({
      headers: {
        Accept: "*/*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
      }
    });
  }
  genId(len = 21) {
    try {
      let id = "";
      const bytes = crypto.randomBytes(len);
      const chars = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
      for (let i = 0; i < len; i++) {
        id += chars[63 & bytes[i]];
      }
      return id;
    } catch (error) {
      console.error("[genId] Error:", error);
      throw error;
    }
  }
  genRandomIP() {
    return `${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }
  createLimiter(interval, rate, concurrency) {
    const queue = [];
    let active = 0,
      lastCalled = 0,
      count = 0;
    const next = () => {
      if (!queue.length || active >= concurrency) return;
      const now = Date.now();
      const elapsed = now - lastCalled;
      if (elapsed > interval) {
        count = 0;
        lastCalled = now;
      }
      if (count >= rate) {
        setTimeout(next, interval - elapsed);
        return;
      }
      active++;
      count++;
      const {
        fn,
        resolve,
        reject
      } = queue.shift();
      fn().then(resolve).catch(reject).finally(() => {
        active--;
        next();
      });
    };
    return fn => new Promise((resolve, reject) => {
      queue.push({
        fn: fn,
        resolve: resolve,
        reject: reject
      });
      next();
    });
  }
  async genToken(secret) {
    try {
      const randomIP = this.genRandomIP();
      return CryptoJS.AES.encrypt(randomIP, secret).toString();
    } catch (error) {
      console.error("[genToken] Error:", error);
      throw error;
    }
  }
  cleanText(text) {
    try {
      return text.replace(/```[\s\S]*?```/g, "").replace(/\[\[([cC])itation/g, "[citation").replace(/[cC]itation:(\d+)]]/g, "citation:$1]").replace(/\[\[([cC]itation:\d+)]](?!])/g, "[$1]").replace(/\[[cC]itation:(\d+)]/g, "[citation]($1)");
    } catch (error) {
      console.error("[cleanText] Error:", error);
      return text;
    }
  }
  async processStream(res) {
    const decoder = new TextDecoder();
    let buffer = new Uint8Array([]);
    let text = "";
    const result = {
      metadata: null,
      content: "",
      relatedQuestions: []
    };
    try {
      for await (const chunk of res.data) {
        buffer = new Uint8Array([...buffer, ...chunk]);
        text = decoder.decode(buffer, {
          stream: true
        });
        if (text.includes(this.LLM_MARKER)) {
          const [meta, content] = text.split(this.LLM_MARKER);
          if (!result.metadata) {
            try {
              result.metadata = JSON.parse(meta);
              console.log("[processStream] Metadata parsed");
            } catch (error) {
              console.error("[processStream] Metadata parse error:", error);
              result.metadata = {};
            }
          }
          if (content.includes(this.QUESTIONS_MARKER)) {
            const [main, questions] = content.split(this.QUESTIONS_MARKER);
            result.content = this.cleanText(main);
            try {
              result.relatedQuestions = JSON.parse(questions);
              console.log("[processStream] Related questions parsed");
            } catch (error) {
              console.error("[processStream] Questions parse error:", error);
              result.relatedQuestions = [];
            }
          } else {
            result.content = this.cleanText(content);
          }
        }
      }
      return result;
    } catch (error) {
      console.error("[processStream] Error:", error);
      throw error;
    }
  }
  async chat({
    prompt,
    visitorId,
    searchId
  }) {
    try {
      console.log(`[chat] Starting chat with prompt: "${prompt}"`);
      const vid = visitorId || this.genId(32);
      const sid = searchId || this.genId(16);
      const token = await this.genToken(vid);
      const execute = async () => {
        try {
          const res = await this.axios.post(`${this.BASE_URL}/api/aiquery`, {
            query: prompt,
            search_uuid: sid,
            visitor_uuid: vid,
            token: token
          }, {
            headers: {
              "Content-Type": "application/json",
              origin: this.BASE_URL,
              referer: `${this.BASE_URL}/search?q=${encodeURIComponent(prompt)}&rid=${sid}`
            },
            responseType: "stream"
          });
          if (res.status !== 200) {
            throw new Error(`API responded with status ${res.status}`);
          }
          const result = await this.processStream(res);
          console.log("[chat] Chat completed successfully");
          return {
            success: true,
            data: {
              response: result.content,
              metadata: result.metadata,
              relatedQuestions: result.relatedQuestions,
              visitorId: vid,
              searchId: sid
            }
          };
        } catch (error) {
          console.error("[execute] Error:", error);
          throw error;
        }
      };
      return await this.limiter(execute);
    } catch (error) {
      console.error("[chat] Error:", error);
      const errorDetails = {
        message: error.message,
        code: error.code,
        stack: error.stack
      };
      return {
        success: false,
        error: error.message,
        details: errorDetails
      };
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
    const ai = new AIChat();
    const response = await ai.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}