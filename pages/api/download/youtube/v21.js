import axios from "axios";
class UniLoaderAPI {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      cookie: "udl_referer=other; _ga=GA1.1.1103326884.1736398440; _ym_uid=1736398441379475941; _ym_d=1736398441; _ym_isad=2; _ym_visorc=b; _ga_RVRM9KJQYW=GS1.1.1736398440.1.1.1736398603.0.0.0",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://uniloader.pro/id/vid/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getFormats(youtubeUrl) {
    const encodedUrl = Buffer.from(youtubeUrl).toString("base64");
    const params = {
      wu: encodedUrl,
      locale: "id",
      parseOnFail: true
    };
    try {
      const response = await axios.get(`${this.baseURL}/formats`, {
        headers: this.headers,
        params: params
      });
      return response.data;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Invalid YouTube URL"
    });
  }
  const api = new UniLoaderAPI("https://uniloader.pro/api");
  try {
    const result = await api.getFormats(url);
    if (result.error) {
      return res.status(500).json({
        error: result.error
      });
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}