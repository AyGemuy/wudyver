import axios from "axios";
import crypto from "crypto";
class MyMapAI {
  constructor() {
    this.baseUrl = "https://www.mymap.ai";
    this.apiUrl = `${this.baseUrl}/sapi/aichat`;
    this.client = axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        authorization: "null",
        "content-type": "application/json",
        cookie: "AWSALBAPP-0=_remove_; AWSALBAPP-1=_remove_; AWSALBAPP-2=_remove_; AWSALBAPP-3=_remove_; i18n_redirected=en; auth.strategy=graphql; auth._token.graphql=false; auth._refresh_token.graphql=false; _gcl_au=1.1.736721384.1741145008",
        origin: this.baseUrl,
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  generateId() {
    return crypto.randomUUID();
  }
  async chat({
    prompt,
    system: systemMessage = "",
    id: boardId = null
  }) {
    try {
      if (!boardId) boardId = this.generateId();
      this.client.defaults.headers["x-distinct-id"] = this.generateId();
      this.client.defaults.headers["referer"] = `${this.baseUrl}/playground?mid=${boardId}`;
      const messages = [];
      if (systemMessage) messages.push({
        type: "text",
        content: systemMessage
      });
      messages.push({
        type: "text",
        content: prompt
      });
      const data = {
        messages: messages,
        board_id: boardId,
        playground: true
      };
      const response = await this.client.post(this.apiUrl, data);
      return response.data;
    } catch (error) {
      console.error("Error fetching response:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.prompt) {
      return res.status(400).json({
        success: false,
        message: "Prompt diperlukan."
      });
    }
    const mymap = new MyMapAI();
    const result = await mymap.chat(params);
    return res.status(200).json({
      result: result
    });
  } catch (err) {
    res.status(500).json({
      message: "Terjadi kesalahan.",
      error: err.message
    });
  }
}