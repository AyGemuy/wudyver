import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
class QuillbotChat {
  constructor() {
    this.token = "empty-token";
    this.jar = new CookieJar();
    try {
      const deviceId = this.uid();
      this.headers = {
        accept: "text/event-stream",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        cookie: `qbDeviceId=${deviceId}; anonID=${this.hex(16)}; ajs_anonymous_id=${deviceId}; premium=false; authenticated=${this.token !== "empty-token"};`,
        origin: "https://quillbot.com",
        "platform-type": "webapp",
        referer: "https://quillbot.com/ai-chat/c/new?tools=web_search",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        useridtoken: this.token,
        "webapp-version": "38.26.0"
      };
      this.client = wrapper(axios.create({
        jar: this.jar,
        baseURL: "https://quillbot.com",
        headers: this.headers
      }));
      this.log("init", "Client siap");
    } catch (err) {
      this.log("error", `Init failed: ${err.message}`);
      throw err;
    }
  }
  uid() {
    return crypto.randomUUID();
  }
  hex(n) {
    return crypto.randomBytes(n / 2).toString("hex");
  }
  log(step, msg) {
    console.log(`[QB:${step.toUpperCase()}] ${msg}`);
  }
  clean(text) {
    return (text ?? "").trim();
  }
  parseChat(raw) {
    const out = {
      result: "",
      annotations: [],
      titles: [],
      status: "",
      chatId: null,
      raw: []
    };
    try {
      const text = Buffer.isBuffer(raw) ? raw.toString() : raw ?? "";
      const lines = text.split("\n").filter(l => l.trim());
      this.log("parse", `${lines.length} baris diterima`);
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          out.raw.push(data);
          switch (data.type) {
            case "content":
              out.result += data.content ?? "";
              break;
            case "status":
              out.status = data.status ?? out.status;
              out.chatId = data.chatId ?? out.chatId;
              break;
            case "title":
              data.title && out.titles.push(data.title);
              break;
            case "annotation":
              data.annotation && out.annotations.push(data.annotation);
              break;
          }
        } catch {}
      }
      out.result = this.clean(out.result);
    } catch (err) {
      this.log("error", `Parse chat failed: ${err.message}`);
    }
    return out;
  }
  async raven(prompt, rest = {}) {
    const payload = {
      stream: true,
      message: {
        role: "user",
        content: prompt,
        messageId: this.uid(),
        createdAt: new Date().toISOString(),
        files: []
      },
      product: "ai-chat",
      originUrl: "/ai-chat",
      prompt: {
        id: "ai_chat"
      },
      tools: ["web_search"],
      ...rest
    };
    try {
      const res = await this.client.post("/api/raven/quill-chat/responses", payload, {
        responseType: "stream",
        headers: {
          accept: "text/event-stream"
        }
      });
      const result = {
        result: "",
        annotations: [],
        titles: [],
        status: "processing",
        chatId: null
      };
      return new Promise((resolve, reject) => {
        res.data.on("data", chunk => {
          try {
            const text = chunk.toString();
            const lines = text.split("\n");
            for (const line of lines) {
              if (!line.trim() || !line.startsWith("data:")) continue;
              try {
                const jsonStr = line.slice(5).trim();
                if (jsonStr === "[DONE]") continue;
                const data = JSON.parse(jsonStr);
                result.result += data.chunk ?? data.content ?? "";
                result.status = data.status ?? result.status;
                result.chatId = data.chatId ?? data.data?.chatId ?? result.chatId;
                data.annotation && result.annotations.push(data.annotation);
                data.title && result.titles.push(data.title);
              } catch {}
            }
          } catch (err) {
            this.log("error", `Stream data error: ${err.message}`);
          }
        });
        res.data.on("end", () => {
          result.status = result.status || "completed";
          result.result = this.clean(result.result);
          this.log("stream", "Raven selesai");
          resolve(result);
        });
        res.data.on("error", err => {
          this.log("error", `Stream error: ${err.message}`);
          reject(err);
        });
      });
    } catch (err) {
      this.log("error", `Raven request failed: ${err.message}`);
      throw err;
    }
  }
  async chat(prompt, chatId, rest = {}) {
    const id = chatId ?? this.uid();
    const payload = {
      message: {
        content: prompt,
        files: [],
        prompt: {
          id: "ai_chat"
        }
      },
      context: {},
      origin: {
        name: "ai-chat.chat",
        url: "https://quillbot.com"
      },
      ...rest
    };
    try {
      const res = await this.client.post(`/api/ai-chat/chat/conversation/${id}`, payload, {
        responseType: "text",
        headers: {
          referer: `https://quillbot.com/ai-chat/c/${id}`
        }
      });
      const parsed = this.parseChat(res.data);
      parsed.chatId = parsed.chatId ?? id;
      parsed.status = parsed.status || "completed";
      return parsed;
    } catch (err) {
      this.log("error", `Chat request failed: ${err.response?.status || err.message}`);
      throw err;
    }
  }
  async generate({
    mode = "chat",
    prompt = "",
    chatId,
    verbose = false,
    ...rest
  } = {}) {
    if (!prompt?.trim()) {
      this.log("warn", "Prompt kosong");
      return {
        success: false,
        error: "Prompt tidak boleh kosong",
        content: "",
        mode: mode,
        timestamp: new Date().toISOString()
      };
    }
    verbose && this.log("start", `Mode: ${mode} | "${prompt.slice(0, 60)}..."`);
    const start = Date.now();
    let rawResult;
    try {
      rawResult = mode.toLowerCase() === "raven" ? await this.raven(prompt, rest) : await this.chat(prompt, chatId, rest);
    } catch (err) {
      this.log("error", `Generate failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        content: "",
        mode: mode,
        timestamp: new Date().toISOString()
      };
    }
    const time = Date.now() - start;
    verbose && this.log("done", `${time}ms | ${rawResult.result.length} chars`);
    return {
      success: true,
      mode: mode,
      content: rawResult.result,
      status: rawResult.status ?? "completed",
      chatId: rawResult.chatId,
      annotations: rawResult.annotations ?? [],
      titles: rawResult.titles ?? [],
      metadata: {
        length: rawResult.result.length,
        wordCount: rawResult.result.split(/\s+/).filter(Boolean).length,
        hasCitations: (rawResult.annotations ?? []).length > 0
      },
      timestamp: new Date().toISOString()
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new QuillbotChat();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}