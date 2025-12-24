import axios from "axios";
class DuckDns {
  constructor() {
    this.apiUrl = "http://chatbot-prototype.duckdns.org/api/chatbot";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "http://chatbot-prototype.duckdns.org/"
    };
  }
  createPayload(inputData) {
    return {
      message: inputData.prompt || "Hy",
      chatId: inputData.id || -1
    };
  }
  async sendRequest(payload) {
    const response = await axios.post(this.apiUrl, payload, {
      headers: this.headers
    });
    return response.data;
  }
}
export default async function handler(req, res) {
  const inputData = req.method === "POST" ? req.body : req.query;
  const duckDns = new DuckDns();
  try {
    const payload = duckDns.createPayload(inputData);
    const data = await duckDns.sendRequest(payload);
    const delTag = teks => teks.startsWith("<p>") && teks.endsWith("</p>") ? teks.slice(3, -4) : teks;
    return res.status(200).json({
      success: true,
      result: delTag(data?.message) || "",
      id: data?.chatId || ""
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to process the request",
      details: error.message
    });
  }
}