import axios from "axios";
class TranslationService {
  constructor() {
    this.apiUrl = "https://sysapi.wordvice.ai/tools/v2/non-member/translate";
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json;charset=UTF-8",
      origin: "https://wordvice.ai",
      referer: "https://wordvice.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async translate({
    text = "Halo, apa kabar?",
    from = "Indonesian",
    to = "English"
  } = {}) {
    try {
      const payload = {
        text: text,
        options: {
          language: from,
          target_language: to
        }
      };
      const response = await axios.post(this.apiUrl, payload, {
        headers: this.headers
      });
      return response.data?.data || response.data;
    } catch (error) {
      return {
        status: "error",
        message: error.response?.data || error.message
      };
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
    if (!data) throw new Error("Gagal mendapatkan respon dari API");
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal"
    });
  }
}