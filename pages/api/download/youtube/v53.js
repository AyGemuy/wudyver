import axios from "axios";
class YoutubeDownloader {
  constructor() {
    this.baseURL = "https://ytdown.ypnk.dpdns.org/yp/downloader";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://ytdown.ypnk.dpdns.org",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://ytdown.ypnk.dpdns.org/yp/downloader",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async download({
    url,
    ...rest
  }) {
    const data = {
      url: url,
      isMobile: true,
      timestamp: Date.now(),
      ...rest
    };
    try {
      const response = await axios.post(this.baseURL, data, {
        headers: this.headers
      });
      if (response.status !== 200) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.data;
    } catch (error) {
      console.error("Error during download:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new YoutubeDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}