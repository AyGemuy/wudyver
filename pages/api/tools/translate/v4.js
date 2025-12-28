import axios from "axios";
class TranslationService {
  constructor() {
    this.api = axios.create({
      baseURL: "https://www.cardscanner.co/api/"
    });
  }
  async translate({
    text,
    from = "auto",
    to = "id"
  }) {
    try {
      const {
        data
      } = await this.api.post("translate", {
        text: text,
        from: from,
        to: to
      });
      return data;
    } catch (err) {
      console.error("[!] Error:", err.response?.data || err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Parameter 'text' diperlukan"
    });
  }
  const api = new TranslationService();
  try {
    const data = await api.translate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}