import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  randomUUID
} from "crypto";
class MerlinAI {
  constructor() {
    this.jar = new CookieJar();
    this.api = wrapper(axios.create({
      jar: this.jar,
      timeout: 6e4
    }));
    this.token = null;
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.apiKey = "AIzaSyAvCgtQ4XbmlQGIynDT-v_M8eLaXrKmtiM";
    this.base = "https://www.getmerlin.in";
  }
  async init() {
    try {
      console.log("🔐 Inisialisasi auth...");
      await this.signUp();
      await this.lookup();
      console.log("✅ Auth berhasil");
    } catch (e) {
      console.error("❌ Init gagal:", e?.message || e);
      throw e;
    }
  }
  async signUp() {
    try {
      const {
        data
      } = await this.api.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.apiKey}`, {
        returnSecureToken: true
      }, {
        headers: {
          "user-agent": this.ua
        }
      });
      this.token = data?.idToken;
      console.log("📝 SignUp OK");
    } catch (e) {
      console.error("SignUp error:", e?.response?.data || e?.message);
      throw e;
    }
  }
  async lookup() {
    try {
      await this.api.post(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${this.apiKey}`, {
        idToken: this.token
      }, {
        headers: {
          "user-agent": this.ua
        }
      });
      console.log("🔍 Lookup OK");
    } catch (e) {
      console.log("⚠️  Lookup skip");
    }
  }
  async upload(file) {
    try {
      const id = randomUUID();
      const isUrl = typeof file === "string" && file.startsWith("http");
      const isBase64 = typeof file === "string" && file.startsWith("data:");
      const isBuffer = Buffer.isBuffer(file);
      let buffer, mime = "image/jpeg",
        name = `${id}.jpg`;
      if (isUrl) {
        console.log("📥 Download dari URL...");
        const {
          data,
          headers
        } = await this.api.get(file, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(data);
        mime = headers?.["content-type"] || mime;
        const ext = mime.split("/")[1] || "jpg";
        name = `${id}.${ext}`;
      } else if (isBase64) {
        const [header, b64] = file.split(",");
        mime = header?.match(/:(.*?);/)?.[1] || mime;
        buffer = Buffer.from(b64, "base64");
        const ext = mime.split("/")[1] || "jpg";
        name = `${id}.${ext}`;
      } else if (isBuffer) {
        buffer = file;
      } else {
        throw new Error("Invalid file type");
      }
      console.log("🔑 Presigned URL...");
      const {
        data: pre
      } = await this.api.post(`${this.base}/arcane/api/v1/user/getPresignedUrl`, {
        files: [{
          id: id,
          name: name,
          type: mime
        }]
      }, {
        headers: {
          authorization: `Bearer ${this.token}`,
          "user-agent": this.ua
        }
      });
      const signedData = pre?.data?.signedUrls?.[id];
      const uploadUrl = signedData?.url;
      const gcsId = signedData?.fileName;
      if (!uploadUrl) throw new Error("No upload URL");
      console.log("⬆️  Upload file...");
      await this.api.put(uploadUrl, buffer, {
        headers: {
          "content-type": mime
        }
      });
      console.log("📤 Finalisasi upload...");
      const payload = {
        attachment: {
          fileName: name,
          gcsId: gcsId,
          id: id,
          mimeType: mime,
          url: uploadUrl,
          type: "IMAGE"
        },
        language: "ENGLISH",
        chatId: randomUUID(),
        backgroundTask: true
      };
      const {
        data: fin
      } = await this.api.post(`${this.base}/arcane/api/v2/user/upload`, payload, {
        headers: {
          authorization: `Bearer ${this.token}`,
          "user-agent": this.ua
        }
      });
      console.log("✅ Upload berhasil");
      return fin?.data?.attachment;
    } catch (e) {
      console.error("❌ Upload gagal:", e?.message || e);
      console.error("📛 Error detail:", e?.response?.data || e);
      throw e;
    }
  }
  async chat({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      if (!this.token) await this.init();
      const chatId = randomUUID();
      const msgId = randomUUID();
      const childId = randomUUID();
      let attachments = [];
      if (imageUrl) {
        console.log("🖼️  Proses gambar...");
        const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        for (const url of urls) {
          const att = await this.upload(url);
          if (att) attachments.push(att);
        }
      }
      console.log("💬 Kirim chat...");
      const {
        data: stream
      } = await this.api.post(`${this.base}/arcane/api/v2/thread/unified`, {
        attachments: attachments,
        chatId: chatId,
        language: "AUTO",
        message: {
          childId: childId,
          content: prompt,
          context: "",
          id: msgId,
          parentId: "root"
        },
        mode: "UNIFIED_CHAT",
        model: rest?.model || "gemini-2.5-flash",
        metadata: {
          noTask: true,
          isWebpageChat: false,
          deepResearch: false,
          webAccess: true,
          proFinderMode: false,
          mcpConfig: {
            isEnabled: false
          },
          merlinMagic: false,
          ...rest?.metadata
        }
      }, {
        headers: {
          authorization: `Bearer ${this.token}`,
          "user-agent": this.ua,
          accept: "text/event-stream"
        },
        responseType: "stream"
      });
      return this.parse(stream);
    } catch (e) {
      console.error("❌ Chat gagal:", e?.message || e);
      console.error("📛 Error detail:", e?.response?.data || e);
      throw e;
    }
  }
  async parse(stream) {
    return new Promise((res, rej) => {
      let result = "";
      let buf = "";
      const events = {};
      stream.on("data", chunk => {
        buf += chunk.toString();
        const lines = buf.split("\n\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const [evt, data] = line.split("\n");
          if (evt?.startsWith("event:") && data?.startsWith("data:")) {
            const type = evt.slice(7).trim();
            const json = data.slice(6).trim();
            try {
              const obj = JSON.parse(json);
              if (type === "message" && obj?.data?.text) {
                result += obj.data.text;
                console.log(obj.data.text);
              }
              if (!events[type]) events[type] = [];
              events[type].push(obj);
            } catch {}
          }
        }
      });
      stream.on("end", () => {
        console.log("\n✅ Selesai");
        res({
          result: result,
          ...events
        });
      });
      stream.on("error", rej);
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
  const api = new MerlinAI();
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