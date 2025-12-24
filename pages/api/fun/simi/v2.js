import axios from "axios";
class SimSimiAPI {
  constructor() {
    this.url = "https://api.simsimi.vn/v1/simtalk";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      Referer: "https://simsimi.vn/#TestAPI"
    };
  }
  async sendMessage(text, lc = "id") {
    const data = new URLSearchParams();
    data.append("text", text);
    data.append("lc", lc);
    try {
      const response = await axios.post(this.url, data, {
        headers: this.headers,
        responseType: "json"
      });
      return response.data;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    text,
    lang
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: 'Paramenter "text" diperlukan'
    });
  }
  const simChat = new SimSimiAPI();
  try {
    const result = await simChat.sendMessage(text, lang);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(500).json({
      error: "Failed to process the request",
      details: error.message
    });
  }
}