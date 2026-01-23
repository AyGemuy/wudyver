import axios from "axios";
import crypto from "crypto";
class ZagClient {
  constructor() {
    this.url = "https://aichat.zagtechnology.com/chat-ai-api/chatbot-api.php";
    this.key = "IWOpYXNZjxVL5Sc3IWOpYXNZjxVL5Sc3";
    this.iv = "1234567812345678";
    this.token = "TfcayRY+W96Xfl67mk3xIy902CFTLVcMKS7Y+sG0H0U=";
    this.headers = {
      "User-Agent": "okhttp/4.11.0",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json"
    };
  }
  log(msg, type = "INFO") {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${type}] ${msg}`);
  }
  enc(text) {
    try {
      const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(this.key), Buffer.from(this.iv));
      let encrypted = cipher.update(text, "utf8", "base64");
      encrypted += cipher.final("base64");
      return encrypted;
    } catch (e) {
      this.log(`Encrypt Error: ${e.message}`, "ERR");
      return null;
    }
  }
  async chat({
    prompt
  }) {
    const encryptedPrompt = this.enc(prompt);
    if (!encryptedPrompt) return;
    const rawString = `${this.token}:${encryptedPrompt}\n`;
    const payload = {
      input: rawString
    };
    this.log(`Prompt: "${prompt}"`, "USER");
    this.log(`Payload: ${JSON.stringify(payload)}`, "DEBUG");
    try {
      const res = await axios.post(this.url, payload, {
        headers: this.headers,
        timeout: 12e4
      });
      const data = res.data;
      const reply = data;
      this.log(`Reply: ${JSON.stringify(reply)}`, "BOT");
      return reply;
    } catch (err) {
      const status = err.response?.status || "N/A";
      const msg = err.response?.data?.message || err.message;
      this.log(`Request Failed (${status}): ${msg}`, "ERR");
      return null;
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
  const api = new ZagClient();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}