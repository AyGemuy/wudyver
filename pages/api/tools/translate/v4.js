import fetch from "node-fetch";
export default async function handler(req, res) {
  try {
    const {
      text,
      source = "auto",
      target = "id"
    } = req.method === "GET" ? req.query : req.body;
    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Paramenter 'text' diperlukan."
      });
    }
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    const translatedText = data?.[0]?.[0]?.[0] || "Terjemahan tidak ditemukan.";
    return res.status(200).json({
      success: true,
      translatedText: translatedText
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}