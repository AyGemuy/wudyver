import axios from "axios";
class SimSimiAPI {
  constructor() {
    this.urls = ["https://api.simsimi.net/v2/", "http://api.brainshop.ai/get?bid=153868&key=rcKonOgrUFmn5usX&uid=1&msg="];
  }
  async sendMessage(text) {
    const encodedText = encodeURIComponent(text);
    let responseData = null;
    for (const url of this.urls) {
      try {
        const fullUrl = url.includes("simsimi") ? `${url}?text=${encodedText}&lc=id` : `${url}${encodedText}`;
        const response = await axios.get(fullUrl);
        if (url.includes("simsimi") && response.data.success) {
          responseData = response.data.success;
          break;
        }
        if (url.includes("brainshop") && response.data.cnt) {
          responseData = response.data.cnt;
          break;
        }
      } catch (error) {
        console.error("Error fetching from API:", error);
      }
    }
    return responseData;
  }
}
export default async function handler(req, res) {
  const {
    text
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: 'Paramenter "text" diperlukan'
    });
  }
  const simChat = new SimSimiAPI();
  try {
    const result = await simChat.sendMessage(text);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(500).json({
      error: "Failed to process the request",
      details: error.message
    });
  }
}