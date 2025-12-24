import axios from "axios";
class OntivaAPI {
  constructor() {
    this.baseURL = "https://api.ontiva.com/v1/external/search/";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://ontiva.com",
      priority: "u=1, i",
      referer: "https://ontiva.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async search(query) {
    try {
      const response = await axios.get(this.baseURL, {
        headers: this.headers,
        params: {
          query: query
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error during search:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Paramenter 'query' is required"
    });
  }
  try {
    const ontivaAPI = new OntivaAPI();
    const result = await ontivaAPI.search(query);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}