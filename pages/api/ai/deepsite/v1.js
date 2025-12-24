import axios from "axios";
class AIPageGenerator {
  constructor() {
    this.baseUrl = "https://victor-deepsite.hf.space";
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: this.baseUrl,
        priority: "u=1, i",
        referer: `${this.baseUrl}/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  _parseHtmlResponse(rawResponse) {
    if (typeof rawResponse !== "string" || !rawResponse.trim()) {
      console.warn("[AI Response] Respons mentah kosong atau bukan string.");
      return null;
    }
    const match = rawResponse.match(/<!DOCTYPE html>[\s\S]*<\/html>/);
    const extractedHtml = match ? match[0] : null;
    if (!extractedHtml) {
      console.warn("[AI Response] Tag <!DOCTYPE html> dan </html> tidak ditemukan dalam respons.");
    }
    return extractedHtml;
  }
  async chat({
    prompt,
    ...rest
  }) {
    console.log(`Log: Memulai chat AI dengan prompt: "${prompt}"`);
    try {
      const payload = {
        prompt: prompt,
        ...rest
      };
      console.log("Log: Mengirim prompt asli ke AI...");
      const response = await this.apiClient.post("/api/ask-ai", payload, {
        responseType: "text"
      });
      const rawResponse = response.data;
      console.log("Log: Menerima respons dari AI.");
      const parsedHtml = this._parseHtmlResponse(rawResponse);
      return {
        success: true,
        result: parsedHtml,
        raw: rawResponse
      };
    } catch (error) {
      console.error("Log: Terjadi error saat proses chat AI:", error?.message || "Error tidak diketahui");
      const errorMessage = error?.response?.data || error?.message || "Terjadi kesalahan pada server";
      return {
        success: false,
        error: true,
        message: errorMessage
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const generator = new AIPageGenerator();
    const response = await generator.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}