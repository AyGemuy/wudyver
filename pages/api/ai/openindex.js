import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class OpenIndexAPI {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      headers: {
        accept: "text/event-stream",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "text/event-stream",
        referer: "https://openindex.fly.dev/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    }));
  }
  async searchAnswer(params) {
    try {
      const urlParams = new URLSearchParams({
        answerId: params.answerId || "",
        q: params.q || "",
        locale: params.locale || "en",
        model: params.model || "gpt-4o-mini",
        context: params.context || "",
        collection_id: params.collection_id || "",
        pro: params.pro || "false"
      });
      const response = await this.client.get(`https://openindex.fly.dev/api/search/answer?${urlParams}`);
      return response.data.split("\n").filter(line => line.startsWith("data:")).map(line => {
        try {
          const parsed = JSON.parse(line.slice(5));
          return parsed.text || "";
        } catch {
          return "";
        }
      }).filter(text => text).join("").replace(/\[citation:\d+\]/g, "").trim();
    } catch (error) {
      console.error("Request error:", error);
      return "";
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.q) {
    return res.status(400).json({
      error: "Params q is required"
    });
  }
  try {
    const api = new OpenIndexAPI();
    const results = await api.searchAnswer(params);
    return res.status(200).json({
      result: results
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}