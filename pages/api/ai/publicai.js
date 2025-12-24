import axios from "axios";
import {
  randomBytes
} from "crypto";
class Chat {
  constructor() {
    this.base = "https://publicai.co/api/chat";
  }
  gen(len = 16) {
    return randomBytes(len).toString("base64url").slice(0, len);
  }
  async chat({
    id,
    prompt,
    messages,
    ...rest
  }) {
    const cid = id || this.gen();
    const msgs = messages?.length ? messages : [{
      id: this.gen(),
      role: "user",
      parts: [{
        type: "text",
        text: prompt
      }]
    }];
    console.log("[Chat] ID:", cid);
    console.log("[Chat] Messages:", msgs.length);
    const data = {
      tools: {},
      id: cid,
      messages: msgs,
      trigger: "submit-message",
      ...rest
    };
    return new Promise(async (resolve, reject) => {
      let result = "";
      let info = {};
      let buffer = "";
      try {
        const response = await axios.post(this.base, data, {
          headers: {
            accept: "*/*",
            "accept-language": "id-ID",
            "content-type": "application/json",
            origin: "https://publicai.co",
            referer: "https://publicai.co/chat",
            "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
          },
          responseType: "stream"
        });
        const stream = response.data;
        console.log("\n[Chat] Stream started");
        stream.on("data", chunk => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop();
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const jsonStr = trimmed.slice(6);
            if (jsonStr === "[DONE]") {
              return;
            }
            try {
              const d = JSON.parse(jsonStr);
              if (d.type === "text-delta") {
                const delta = d.delta || "";
                result += delta;
                process.stdout.write(delta);
              } else if (d.type === "start") {
                info.started = true;
              } else if (d.type === "finish") {
                info.finished = true;
              }
            } catch (e) {}
          }
        });
        stream.on("end", () => {
          console.log("\n[Chat] Stream finished");
          resolve({
            result: result,
            ...info
          });
        });
        stream.on("error", err => {
          console.error("[Chat] Stream Error:", err.message);
          reject(err);
        });
      } catch (err) {
        console.error("[Chat] Request Error:", err.message);
        reject(err);
      }
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new Chat();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}