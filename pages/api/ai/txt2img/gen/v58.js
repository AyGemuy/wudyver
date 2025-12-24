import axios from "axios";
class Talefy {
  constructor() {
    this.api = "https://api.talefy.ai/api/v2/pictures/seo/generate/";
    this.h = {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      origin: "https://talefy.ai",
      referer: "https://talefy.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async generate({
    prompt,
    ...rest
  }) {
    try {
      console.log(`[Talefy] Memproses prompt: ${prompt?.slice(0, 30) || "default"}...`);
      const res = await axios.post(this.api, {
        prompt: prompt || "a cute cat walking",
        ...rest
      }, {
        headers: this.h
      });
      console.log(`[Talefy] Berhasil mendapatkan respon.`);
      return res?.data;
    } catch (e) {
      console.error(`[Talefy Error] ${e?.response?.data?.message || e?.message}`);
      return e?.response?.data || {
        error: e?.message
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
  const api = new Talefy();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}