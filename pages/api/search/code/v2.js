import axios from "axios";
class GrepSearch {
  constructor() {
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=1, i",
      referer: "",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async search(params = {}) {
    const {
      query = "gsk_",
        caseSensitive = true,
        wholeWords = true
    } = params;
    const url = `https://grep.app/api/search?case=${caseSensitive}&words=${wholeWords}&q=${query}`;
    this.headers.referer = `https://grep.app/search?q=${query}`;
    try {
      const response = await axios.get(url, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error during search:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) return res.status(400).json({
    error: 'Paramenter "query" diperlukan'
  });
  const grepSearch = new GrepSearch();
  try {
    const result = await grepSearch.search(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}