import axios from "axios";
import crypto from "crypto";
class PixelChat {
  constructor() {
    this.api = "https://pixeldojo.ai/api/help-system/chat";
  }
  uid() {
    return `anon_${crypto.randomBytes(8).toString("hex")}`;
  }
  hdr() {
    return {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Content-Type": "application/json",
      "sec-ch-ua-platform": '"Android"',
      origin: "https://pixeldojo.ai",
      referer: "https://pixeldojo.ai/ai-chat-online-free-no-login",
      Cookie: "__client_uat=0;"
    };
  }
  async chat({
    prompt,
    messages = [],
    ...rest
  }) {
    try {
      console.log("[Proses] Validasi data input...");
      const baseMsg = {
        role: "assistant",
        content: "Halo! Saya adalah asisten AI yang siap membantu Anda memberikan informasi yang akurat, bermanfaat, dan ramah. Apa yang bisa saya bantu hari ini?"
      };
      const history = messages.length ? messages : [baseMsg];
      history.push({
        role: "user",
        content: prompt || "Halo, siapa kamu?"
      });
      const payload = {
        messages: history,
        userId: rest?.userId || this.uid()
      };
      console.log(`[Proses] Mengirim request untuk User: ${payload.userId}`);
      const res = await axios.post(this.api, payload, {
        headers: this.hdr()
      });
      console.log("[Proses] Respon berhasil didapatkan.");
      return res?.data || {
        error: "No data received"
      };
    } catch (err) {
      console.error("[Error] Detail:", err?.response?.data || err.message);
      return {
        error: true,
        message: err.message
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
  const api = new PixelChat();
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