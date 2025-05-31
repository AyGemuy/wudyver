import axios from "axios";
class ChiakiQuiz {
  constructor() {
    this.url = "https://chiaki.site/?/quiz/async";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://chiaki.site/?/quiz"
    };
  }
  async startQuiz(payload = {}) {
    try {
      const data = new URLSearchParams({
        type: payload.type || "start",
        mode: payload.mode || "relaxed",
        custom_number: payload.custom_number || "2",
        custom_source: payload.custom_source || "1",
        custom_chartype: payload.custom_chartype || "1",
        ...payload
      });
      const response = await axios.post(this.url, data.toString(), {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to start quiz: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  try {
    const query = req.method === "GET" ? req.query : req.body;
    const quiz = new ChiakiQuiz();
    const result = await quiz.startQuiz(query);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}