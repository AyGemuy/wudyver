import axios from "axios";
import crypto from "crypto";
class GoogleBridgeChat {
  constructor() {
    this.baseURL = "https://www.googlebridge.com/rsm/api/chat";
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.googlebridge.com/?book_id=Hy"
    };
  }
  generateId() {
    return crypto.randomUUID();
  }
  async postChat(input = "Halo", book_id = this.generateId(), conversation_id = this.generateId()) {
    try {
      const {
        data
      } = await axios.post(`${this.baseURL}/post`, {
        input: input,
        book_id: book_id,
        conversation_id: conversation_id
      }, {
        headers: this.headers
      });
      console.log("[postChat] Response:", data);
      return data;
    } catch (error) {
      console.error("[postChat] Error:", error.message);
      throw new Error(error.response?.data || "Internal Server Error");
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt: input,
    book_id,
    conversation_id
  } = req.method === "GET" ? req.query : req.body;
  if (!input) return res.status(400).json({
    error: "Prompt is required"
  });
  try {
    const chatAPI = new GoogleBridgeChat();
    const result = await chatAPI.postChat(input, book_id, conversation_id);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}