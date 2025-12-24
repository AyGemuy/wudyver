import axios from "axios";
import FormData from "form-data";
import WebSocket from "ws";
import SpoofHead from "@/lib/spoof-head";
class ImageColorizer {
  constructor() {
    this.cfg = {
      base: "https://beautyf.ai",
      auth: "https://beautyf.ai/api/web/user/auth/device-checkin",
      up: "https://beautyf.ai/api/image/upload",
      wss: "wss://beautyf.ai/api/socket.io/?EIO=4&transport=websocket",
      hdrs: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        origin: "https://www.beautyf.ai",
        pragma: "no-cache",
        referer: "https://www.beautyf.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    };
  }
  slp(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  async getBuf(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (input?.startsWith?.("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      const raw = input?.includes?.("base64,") ? input.split("base64,")[1] : input;
      return Buffer.from(raw || "", "base64");
    } catch (e) {
      throw new Error(`Buffer Resolve Error: ${e.message}`);
    }
  }
  async auth(fcm = "sample_fcm_token_123") {
    try {
      console.log("[Process] Authenticating Device...");
      const res = await axios.post(this.cfg.auth, {
        fcm_token: fcm
      }, {
        headers: this.cfg.hdrs
      });
      const data = res?.data?.data || {};
      const devId = data?.web_device?.id || data?.id;
      console.log(`[Process] Auth Success, Web ID: ${devId || "15649"}`);
      return devId || 15649;
    } catch (e) {
      console.log("[Warn] Auth failed, using fallback ID");
      return 15649;
    }
  }
  async up(buf) {
    try {
      console.log("[Process] Uploading image...");
      const form = new FormData();
      form.append("image", buf, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
      form.append("type", "web");
      const res = await axios.post(this.cfg.up, form, {
        headers: {
          ...this.cfg.hdrs,
          ...form.getHeaders()
        }
      });
      const root = res?.data || {};
      const info = root?.data || {};
      if (!root.success || !info.token) {
        throw new Error(root.message || "Token upload tidak ditemukan");
      }
      console.log("[Process] Upload Success. Token: " + info.token.substring(0, 10) + "...");
      return info;
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      throw new Error(`Upload gagal: ${msg}`);
    }
  }
  async generate({
    imageUrl,
    taskType,
    ...rest
  }) {
    try {
      console.log("[Process] Starting Beautyf AI Task...");
      const web_id = await this.auth(rest.fcm_token);
      const buf = await this.getBuf(imageUrl);
      const upData = await this.up(buf);
      const dims = upData.dimensions || {};
      const scale = dims.width > 1e3 || dims.height > 1e3 ? 1 : 2;
      const payload = {
        publicFilePath: upData.publicFilePath,
        imageTaskTypeId: Number(taskType || 25),
        scalefactor: rest.scale || scale,
        type: "web",
        taskToken: upData.token,
        web_id: web_id
      };
      return new Promise((resolve, reject) => {
        console.log("[Process] Opening WSS Connection...");
        const ws = new WebSocket(this.cfg.wss, {
          headers: this.cfg.hdrs
        });
        const timer = setTimeout(() => {
          ws.terminate();
          reject(new Error("Process Timeout (60s)"));
        }, 6e4);
        ws.on("open", () => console.log("[Process] WSS Connected."));
        ws.on("message", data => {
          const msg = data.toString();
          if (msg.startsWith("0{")) {
            ws.send("40/api/image,");
          }
          if (msg.startsWith("40/api/image,")) {
            console.log("[Process] Namespace Joined. Sending Task...");
            ws.send(`42/api/image,["processImage",${JSON.stringify(payload)}]`);
          }
          if (msg === "2") ws.send("3");
          if (msg.includes("processImageResponse")) {
            clearTimeout(timer);
            try {
              const jsonStr = msg.substring(msg.indexOf("["));
              const [, res] = JSON.parse(jsonStr);
              ws.terminate();
              if (res?.success) {
                console.log("[Process] AI Task Completed!");
                resolve({
                  result: res?.data?.filePath || null,
                  ...res.data
                });
              } else {
                reject(new Error(res?.message || "AI Engine Error"));
              }
            } catch (e) {
              ws.terminate();
              reject(new Error("Parsing Error"));
            }
          }
        });
        ws.on("error", err => {
          clearTimeout(timer);
          reject(new Error(`WSS Error: ${err.message}`));
        });
      });
    } catch (e) {
      console.error("[Error]", e.message);
      return {
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new ImageColorizer();
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