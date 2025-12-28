import fetch from "node-fetch";
class TranslationService {
  constructor() {
    this.baseUrl = "https://translate.googleapis.com/translate_a/single";
  }
  async translate({
    text = "Halo, apa kabar?",
    from = "auto",
    to = "en"
  } = {}) {
    try {
      const url = `${this.baseUrl}?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      const translatedText = data?.[0]?.[0]?.[0] || "Terjemahan tidak ditemukan.";
      return {
        success: true,
        result: translatedText
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
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