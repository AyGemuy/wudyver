import fetch from "node-fetch";
class LRCLibAPI {
  constructor() {
    this.baseURL = "https://lrclib.net/api";
    this.headers = {
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      Pragma: "no-cache",
      Referer: "https://lrclib.net/search",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      accept: "application/json",
      "lrclib-client": "LRCLIB Web Client (https://github.com/tranxuanthang/lrclib)",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "x-user-agent": "LRCLIB Web Client (https://github.com/tranxuanthang/lrclib)"
    };
  }
  async search({
    query
  }) {
    let url = `${this.baseURL}/search?q=${encodeURIComponent(query)}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.headers
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "query are required"
    });
  }
  try {
    const api = new LRCLibAPI();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}