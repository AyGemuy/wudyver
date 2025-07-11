import axios from "axios";
class SaveTube {
  constructor() {
    this.apiUrl = "https://xnplfwb46ecpt6xezyxjieolp40vifvi.lambda-url.ap-south-1.on.aws/";
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      Origin: "https://savetubeonline.com",
      Pragma: "no-cache",
      Referer: "https://savetubeonline.com/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "content-type": "application/json",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async download(url) {
    const body = {
      body: {
        url: url
      }
    };
    try {
      const response = await axios.post(this.apiUrl, body, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching SaveTube data:", error);
      throw error;
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
  const saveTube = new SaveTube();
  try {
    const data = await saveTube.download(url);
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch SaveTube data"
    });
  }
}