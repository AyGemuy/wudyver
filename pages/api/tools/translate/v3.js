import fetch from "node-fetch";
export default async function handler(req, res) {
  if (req.method === "POST" || req.method === "GET") {
    const {
      country = "Indonesian",
        text = ""
    } = req.method === "POST" ? req.body : req.query;
    if (!text) {
      return res.status(400).json({
        status: 1,
        error: "Text is required"
      });
    }
    const targetLang = country.trim();
    const prompt = `Translate the following text into ${targetLang}.`;
    const payload = {
      prompt: prompt,
      text: text,
      tool: "translate"
    };
    try {
      const response = await fetch("https://sysapi.wordvice.ai/tools/non-member/fetch-llm-result", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=utf-8",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Referer: "https://wordvice.ai/tools/translate"
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.code === "0000" && data.result?.length > 0) {
        return res.status(200).json({
          status: 0,
          targetLang: targetLang,
          translatedText: data.result[0]?.text || "No translation available"
        });
      }
      return res.status(500).json({
        status: 1,
        error: "Translation failed",
        details: data
      });
    } catch (error) {
      console.error("Error:", error.message);
      return res.status(500).json({
        status: 1,
        error: "Internal Server Error"
      });
    }
  }
  return res.status(405).json({
    status: 1,
    error: "Method Not Allowed"
  });
}