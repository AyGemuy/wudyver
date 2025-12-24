import axios from "axios";
class SnapinsAPI {
  constructor() {
    this.baseURL = "https://snapins.ai";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://snapins.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://snapins.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async download({
    url
  }) {
    if (!url) {
      throw new Error("Paramenter 'url' wajib disertakan.");
    }
    const data = new URLSearchParams();
    data.append("url", url);
    try {
      const response = await axios.post(`${this.baseURL}/action.php`, data.toString(), {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching data from Snapins.ai:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) return res.status(400).json({
    message: "No url provided"
  });
  const snapins = new SnapinsAPI();
  try {
    const result = await snapins.download(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error during media download:", error);
    return res.status(500).json({
      message: "Error during media download",
      error: error.message
    });
  }
}