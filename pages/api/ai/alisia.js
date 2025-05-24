import axios from "axios";
class AlisiaAPI {
  constructor() {
    this.url = "https://search-with-alisia-1.onrender.com/searchnew?search_type=text";
    this.config = {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://searchwithalisia.netlify.app/"
      }
    };
  }
  async fetchData(query, sessionId) {
    const data = {
      query: query,
      session_id: sessionId,
      search_type_resources: []
    };
    try {
      const response = await axios.post(this.url, data, this.config);
      return response.data;
    } catch (error) {
      throw new Error("Error fetching data from Alisia API: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt: query,
    session_id = "7f2fc21a-ee30-4e76-8b24-2b6dd4d6a7ca"
  } = req.method === "GET" ? req.query : req.body;
  const api = new AlisiaAPI();
  try {
    const response = await api.fetchData(query, session_id);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}