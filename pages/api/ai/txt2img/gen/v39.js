import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
const VALID_RATIOS_CONFIG = [{
  value: "2048x2048",
  label: "2k"
}, {
  value: "1024x1024",
  label: "1:1"
}, {
  value: "1280x720",
  label: "16:9"
}, {
  value: "720x1280",
  label: "9:16"
}];
const VALID_RATIOS = VALID_RATIOS_CONFIG.map(item => item.value);
const DEFAULT_RATIO = "720x1280";

function randToken(len = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < len; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
class Api {
  constructor() {
    const authToken = randToken();
    this.client = axios.create({
      baseURL: "https://www.seedreamai.cc/api",
      headers: {
        authorization: `Bearer ${authToken}`,
        "content-type": "application/json",
        origin: "https://www.seedreamai.cc",
        referer: "https://www.seedreamai.cc/id",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    console.log("[LOG] Api client diinisialisasi.");
  }
  async generate({
    prompt,
    ...rest
  }) {
    console.log("\n[LOG] Memulai proses generate...");
    const providedRatio = rest.aspectRatio;
    let finalRatio;
    if (VALID_RATIOS.includes(providedRatio)) {
      finalRatio = providedRatio;
      console.log(`[LOG] Aspect ratio valid digunakan: ${finalRatio}`);
    } else {
      if (providedRatio) {
        console.warn(`[WARN] Aspect ratio "${providedRatio}" tidak valid.`);
      }
      finalRatio = DEFAULT_RATIO;
      console.log(`[LOG] Menggunakan aspect ratio default: ${finalRatio}`);
    }
    const body = {
      prompt: prompt,
      aspectRatio: finalRatio,
      watermark: rest.watermark ?? true
    };
    try {
      console.log("[LOG] Mengirim request dengan body:", JSON.stringify(body, null, 2));
      const response = await this.client.post("/generate-image", body);
      console.log(response.status === 200 ? "[LOG] Request berhasil." : `[LOG] Request selesai dengan status ${response.status}.`);
      return response?.data;
    } catch (error) {
      console.error("[ERROR] Gagal saat memanggil API!");
      const message = error.response?.data?.message || error.message;
      throw new Error(message);
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
    const api = new Api();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}