import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
import crypto from "crypto";
class Dgaf {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://dgaf.ai/api",
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://dgaf.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://dgaf.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
  }
  log(msg, type = "INFO") {
    console.log(`[${new Date().toLocaleTimeString()}] [${type}] ${msg}`);
  }
  async solve() {
    try {
      this.log("Requesting Altcha challenge...", "POW");
      const {
        data
      } = await this.client.get("/altcha/challenge");
      const {
        algorithm,
        challenge,
        salt,
        maxnumber,
        signature
      } = data || {};
      if (!challenge || !salt) throw new Error("Invalid challenge data");
      this.log(`Solving SHA-256... Max: ${maxnumber}`, "COMPUTE");
      const start = Date.now();
      let number = 0;
      let found = false;
      while (number <= (maxnumber || 1e5)) {
        const hash = crypto.createHash("sha256").update(salt + number).digest("hex");
        if (hash === challenge) {
          found = true;
          break;
        }
        number++;
      }
      if (!found) throw new Error("Failed to solve Altcha");
      const took = Date.now() - start;
      this.log(`Solved: ${number} (${took}ms)`, "SUCCESS");
      const payload = JSON.stringify({
        algorithm: algorithm,
        challenge: challenge,
        number: number,
        salt: salt,
        signature: signature,
        took: took
      });
      return Buffer.from(payload).toString("base64");
    } catch (e) {
      this.log(e.message, "ERROR");
      return null;
    }
  }
  async upload(media) {
    if (!media) return null;
    try {
      this.log("Processing media...", "UPLOAD");
      let buffer, filename = `file_${Date.now()}.png`;
      if (Buffer.isBuffer(media)) {
        buffer = media;
      } else if (typeof media === "string") {
        if (media.startsWith("http")) {
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(res.data);
        } else {
          const raw = media.includes(",") ? media.split(",")[1] : media;
          buffer = Buffer.from(raw, "base64");
        }
      }
      if (!buffer) return null;
      const form = new FormData();
      form.append("file", buffer, {
        filename: filename,
        contentType: "image/png"
      });
      const {
        data
      } = await this.client.post("/chat/upload", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      return data?.success ? data.url : null;
    } catch (e) {
      this.log(`Upload failed: ${e.message}`, "ERROR");
      return null;
    }
  }
  async chat({
    prompt,
    messages = [],
    media,
    ...rest
  }) {
    try {
      const token = await this.solve();
      if (!token) throw new Error("Token generation failed");
      const mediaUrl = media ? await this.upload(media) : null;
      const contentData = mediaUrl ? JSON.stringify([{
        type: "text",
        text: prompt || ""
      }, {
        type: "image",
        image: mediaUrl
      }]) : prompt || "";
      const newMessage = {
        role: "user",
        content: contentData,
        parts: [{
          type: "text",
          text: contentData
        }]
      };
      const history = [...messages, newMessage];
      const id = rest.id || crypto.randomBytes(8).toString("hex");
      const payload = {
        id: id,
        messages: history,
        altchaPayload: token,
        ...rest
      };
      this.log("Sending chat request...", "CHAT");
      const {
        data: rawStream
      } = await this.client.post("/chat/", payload, {
        responseType: "text"
      });
      let fullReply = "";
      const lines = rawStream.split("\n");
      for (const line of lines) {
        if (line.startsWith("0:")) {
          try {
            const chunk = JSON.parse(line.substring(2));
            fullReply += chunk;
          } catch {}
        }
      }
      this.log(`Reply: ${fullReply.substring(0, 50)}...`, "DONE");
      return {
        status: true,
        reply: fullReply,
        history: [...history, {
          role: "assistant",
          content: fullReply
        }]
      };
    } catch (e) {
      this.log(`Chat Error: ${e.message}`, "ERROR");
      return {
        status: false,
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new Dgaf();
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