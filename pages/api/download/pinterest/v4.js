import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class PintoDownloader {
  constructor() {
    const jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: jar
    }));
    this.baseUrl = "https://pintod.com/wp-json/aio-dl/video-data/";
  }
  async getRedirect(url) {
    try {
      const response = await axios.get(url, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      return response.headers.location || url;
    } catch (error) {
      return error.response?.headers?.location || url;
    }
  }
  async download(inputUrl) {
    const url = await this.getRedirect(inputUrl);
    try {
      const requestData = new URLSearchParams();
      requestData.append("url", url);
      const response = await this.client.post(this.baseUrl, requestData.toString(), {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://pintod.com",
          referer: "https://pintod.com/id/pengunduh-video-pinterest/",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log("Downloaded Data:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error downloading video data from Pinto:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: "URL is required"
  });
  try {
    const downloader = new PintoDownloader();
    const result = await downloader.download(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}