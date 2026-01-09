import axios from "axios";
class InfoQueriesAPI {
  constructor() {
    this.baseUrl = "https://infoqueries.com";
    this.apiUrl = "https://infoqueries.com/api/aisearch";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://infoqueries.com",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  updateReferer(query, type = "0") {
    const encodedQuery = encodeURIComponent(query);
    this.headers["referer"] = `https://infoqueries.com/searchai?q=${encodedQuery}&type=${type}`;
  }
  async chat({
    prompt: q,
    type = "0",
    ...rest
  }) {
    try {
      console.log(`Searching for: "${q}" with type: ${type}`);
      this.updateReferer(q, type);
      const requestBody = {
        q: q,
        type: type.toString(),
        ...rest
      };
      console.log("Request URL:", this.apiUrl);
      console.log("Request Body:", JSON.stringify(requestBody, null, 2));
      const response = await axios.post(this.apiUrl, requestBody, {
        headers: this.headers
      });
      console.log("Search completed successfully");
      return response.data;
    } catch (error) {
      console.error("Error during search:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new InfoQueriesAPI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}