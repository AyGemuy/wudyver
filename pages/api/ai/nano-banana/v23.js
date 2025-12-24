import axios from "axios";
class GemBananaAI {
  constructor() {
    this.base = "https://efnlaalbmjngrdoessky.supabase.co/functions/v1";
    this.token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbmxhYWxibWpuZ3Jkb2Vzc2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzA2MjMsImV4cCI6MjA3NTQ0NjYyM30.1Fk6Fl0RiB5a4h_KBSEqRocK_61vYRN-1v36eeZznbQ";
  }
  headers() {
    return {
      accept: "*/*",
      authorization: `Bearer ${this.token}`,
      "content-type": "application/json",
      origin: "https://geminibanana.fun",
      referer: "https://geminibanana.fun/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  log(msg, data) {
    console.log(`[GemBananaAI] ${msg}`, data || "");
  }
  async generate({
    prompt,
    imageUrl,
    size = "768x768",
    ...opt
  }) {
    try {
      const isImg2Img = !!imageUrl;
      this.log(isImg2Img ? "🖼️ Img2Img..." : "🎨 Txt2Img...");
      const payload = isImg2Img ? {
        editInstruction: prompt,
        size: size,
        imageUrl: imageUrl,
        ...opt
      } : {
        prompt: prompt,
        size: size,
        ...opt
      };
      const endpoint = isImg2Img ? `${this.base}/edit-image` : `${this.base}/generate-image`;
      const r = await axios.post(endpoint, payload, {
        headers: this.headers()
      });
      const data = r?.data;
      this.log("✅ Done:", data);
      return data;
    } catch (e) {
      this.log("❌ Generate error:", e?.response?.data || e.message);
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
  const api = new GemBananaAI();
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