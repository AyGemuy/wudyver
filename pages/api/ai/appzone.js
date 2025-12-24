import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class AIClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || "https://api.appzone.tech/v1";
    this.timeout = config.timeout || 12e4;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        ...SpoofHead(),
        ...config.headers
      }
    });
    console.log("[AIClient] Initialized");
  }
  async chat({
    prompt,
    messages,
    imageUrl,
    ...rest
  }) {
    console.log("[Chat] Starting request...");
    try {
      const payload = {
        model: "gpt-4",
        stream: true,
        web_search: false,
        reason: false,
        study_mode: false,
        ...rest,
        messages: this.buildMsg({
          prompt: prompt,
          messages: messages,
          imageUrl: imageUrl
        })
      };
      console.log("[Chat] Sending request");
      const response = await this.client.post("/chat/completions", payload, {
        responseType: "stream",
        headers: this.getHeaders()
      });
      console.log("[Chat] Stream started");
      const result = await this.handleStream(response.data);
      console.log(`[Chat] Completed - Chars: ${result.result.length}`);
      return result;
    } catch (error) {
      console.error("[Chat] Request failed:", error?.message);
      throw this.handleErr(error);
    }
  }
  buildMsg({
    prompt,
    messages,
    imageUrl
  }) {
    const msgArr = messages?.length ? messages : [];
    const formatted = msgArr.map(msg => this.fmtMsg(msg));
    if (prompt) {
      formatted.push(this.userMsg(prompt, imageUrl));
    }
    console.log(`[Messages] Count: ${formatted.length}`);
    return formatted;
  }
  fmtMsg(msg) {
    const role = msg?.isUser ? "user" : "assistant";
    const content = [];
    if (msg?.text) {
      content.push({
        type: "text",
        text: msg.text || ""
      });
    }
    if (msg?.image) {
      const img = this.fmtImg(msg.image);
      img && content.push(img);
    }
    if (msg?.document) {
      const doc = this.fmtDoc(msg.document);
      doc && content.push(doc);
    }
    return {
      role: role,
      content: content.length ? content : [{
        type: "text",
        text: ""
      }]
    };
  }
  userMsg(prompt, imageUrl) {
    const content = [{
      type: "text",
      text: prompt || ""
    }];
    if (imageUrl) {
      const img = this.fmtImg(imageUrl);
      img && content.push(img);
    }
    return {
      role: "user",
      content: content
    };
  }
  fmtImg(img) {
    if (!img) return null;
    let imgData = img;
    if (typeof img === "object") {
      imgData = img.base64 || img.uri || img.url;
    }
    if (!imgData) return null;
    const url = imgData.startsWith("data:") ? imgData : `data:image/jpeg;base64,${imgData}`;
    return {
      type: "image_url",
      image_url: {
        url: url
      }
    };
  }
  fmtDoc(doc) {
    if (!doc) return null;
    const name = doc?.name || "document";
    const text = doc?.text || doc?.content || "";
    return {
      type: "text",
      text: `Doc ${name}: ${text}`
    };
  }
  getHeaders() {
    return {
      Authorization: "Bearer az-chatai-key",
      "X-App-Version": "1.0.0",
      "X-User-ID": "anonymous"
    };
  }
  handleStream(stream) {
    return new Promise((resolve, reject) => {
      const data = {
        result: "",
        model: "",
        id: "",
        chunk: []
      };
      console.log("[Stream] Processing...");
      stream.on("data", chunk => {
        const lines = chunk.toString().split("\n").filter(l => l?.trim());
        for (const line of lines) {
          if (line === "data: [DONE]") continue;
          if (!line.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            data.chunk.push(json);
            data.id = data.id || json?.id || "";
            data.model = data.model || json?.model || "";
            const content = json?.choices?.[0]?.delta?.content;
            if (content) {
              data.result += content;
              process.stdout.write(content);
            }
          } catch (e) {
            console.warn(`[Stream] Parse warn:`, e?.message);
          }
        }
      });
      stream.on("end", () => {
        console.log(`\n[Stream] Done - chunks: ${data.chunk.length}`);
        resolve(data);
      });
      stream.on("error", error => {
        console.error("[Stream] Error:", error?.message);
        reject(error);
      });
    });
  }
  handleErr(error) {
    const status = error?.response?.status;
    const msg = error?.response?.data?.message || error?.message || "Error";
    const code = error?.code || status || 500;
    return new Error(`API Error (${code}): ${msg}`);
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
    const client = new AIClient();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}