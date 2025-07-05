import axios from "axios";
class AIFreeBoxAI {
  constructor() {
    this.baseURL = "https://aifreebox.com/api";
    this.session = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://aifreebox.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://aifreebox.com/image-generator/ai-photo-generator",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async generateImage({
    prompt,
    ratio = "4:5",
    slug = "ai-photo-generator"
  }) {
    try {
      console.log(`Membuat gambar dengan prompt: "${prompt}"`);
      const response = await this.session.post("/image-generator", {
        userPrompt: prompt,
        aspectRatio: ratio,
        slug: slug
      });
      console.log("Permintaan berhasil dikirim.");
      return response.data;
    } catch (error) {
      console.error("Gagal membuat gambar:", error.message);
      if (error.response) {
        console.error("Data respons error:", error.response.data);
        console.error("Status respons error:", error.response.status);
        console.error("Header respons error:", error.response.headers);
      } else if (error.request) {
        console.error("Tidak ada respons yang diterima:", error.request);
      } else {
        console.error("Terjadi kesalahan saat menyiapkan permintaan:", error.message);
      }
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const aifreebox = new AIFreeBoxAI();
  try {
    const response = await aifreebox.generateImage(params);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}