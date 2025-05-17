import WebSocket from "ws";
import crypto from "crypto";
import axios from "axios";
class ColorifyAI {
  constructor() {
    this.ws = null;
    this.sessionHash = this.generateHash();
  }
  generateHash() {
    return crypto.randomBytes(8).toString("hex");
  }
  async imageToBase64(imageUrl = "https://i.pinimg.com/236x/21/81/c4/2181c4e2d51db79bb2ac000dcac2df90.jpg") {
    try {
      const res = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return `data:image/webp;base64,${Buffer.from(res.data).toString("base64")}`;
    } catch (error) {
      console.error("Error converting image to base64:", error);
      throw error;
    }
  }
  async start(options) {
    return new Promise((resolve, reject) => {
      let wsUrl = "";
      if (options.type === "img2color") {
        wsUrl = "wss://colorifyai.art/demo-auto-coloring/queue/join";
      } else if (options.type === "txt2img") {
        wsUrl = "wss://colorifyai.art/demo-colorify-text2img/queue/join";
      } else if (options.type === "img2img") {
        wsUrl = "wss://colorifyai.art/demo-colorify-img2img/queue/join";
      } else {
        return reject(new Error("Tipe tidak valid. Gunakan 'image-to-color', 'text-to-image', atau 'image-to-image'."));
      }
      this.ws = new WebSocket(wsUrl, {
        headers: {
          Upgrade: "websocket",
          Origin: "https://colorifyai.art",
          "Cache-Control": "no-cache",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          Pragma: "no-cache",
          Connection: "Upgrade",
          "Sec-WebSocket-Key": crypto.randomBytes(16).toString("base64"),
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "Sec-WebSocket-Version": "13",
          "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits"
        }
      });
      this.ws.on("open", () => {
        console.log("Terhubung ke WebSocket, menunggu pesan send_hash...");
      });
      this.ws.on("message", async data => {
        const response = JSON.parse(data.toString());
        if (response.msg === "send_hash") {
          console.log("Mengirim session_hash...");
          this.ws.send(JSON.stringify({
            session_hash: this.sessionHash
          }));
        }
        if (response.msg === "send_data") {
          console.log("Mengirim data...");
          try {
            let requestData = {};
            if (options.type === "image-to-color" || options.type === "image-to-image") {
              const base64Image = await this.imageToBase64(options.imageUrl);
              requestData = {
                data: {
                  source_image: base64Image,
                  prompt: options.prompt || "(masterpiece), best quality",
                  request_from: 10
                }
              };
            } else {
              requestData = {
                data: {
                  prompt: options.prompt,
                  style: options.style || "default",
                  aspect_ratio: options.aspectRatio || "9:16",
                  request_from: 10
                }
              };
            }
            this.ws.send(JSON.stringify(requestData));
          } catch (err) {
            reject(err);
          }
        }
        if (response.msg === "process_completed") {
          console.log("Proses selesai:", response);
          resolve({
            baseUrl: "https://temp.colorifyai.art",
            ...typeof response.output === "object" && response.output !== null ? response.output : {}
          });
          this.ws.close();
        }
      });
      this.ws.on("error", error => {
        console.error("WebSocket Error:", error);
        reject(error);
      });
      this.ws.on("close", () => {
        console.log("WebSocket ditutup");
      });
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const validTypes = ["img2color", "txt2img", "img2img"];
  if (!params.type || !validTypes.includes(params.type.toLowerCase())) {
    return res.status(400).json({
      error: "Invalid type. Allowed types: img2color, txt2img, img2img"
    });
  }
  const ai = new ColorifyAI();
  try {
    const data = await ai.start(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during ws request"
    });
  }
}