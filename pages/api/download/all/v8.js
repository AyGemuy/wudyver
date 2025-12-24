import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class AllDownloader {
  constructor(host = 11) {
    this.BASE_URLS = {
      1: "https://steptodown.com/wp-json/aio-dl/video-data/",
      2: "https://saveclips.net/wp-json/aio-dl/video-data/",
      3: "https://snapfrom.com/wp-json/aio-dl/video-data/",
      4: "https://smediasaver.com/wp-json/aio-dl/video-data/",
      5: "https://vidburner.com/wp-json/aio-dl/video-data/",
      6: "https://mrsdownloader.com/wp-json/aio-dl/video-data/",
      7: "https://snapsave.cc/wp-json/aio-dl/video-data/",
      8: "https://1videodownloader.com/wp-json/aio-dl/video-data/",
      9: "https://capdownloader.com/wp-json/aio-dl/video-data/",
      10: "https://snapdouyin.app/wp-json/mx-downloader/video-data/",
      11: "https://scdler.com/wp-json/aio-dl/video-data/",
      12: "https://smskull.com/wp-json/aio-dl/video-data/"
    };
    this.totalHosts = Object.keys(this.BASE_URLS).length;
    this.BASE_URL = this.BASE_URLS[Math.min(Math.max(host, 1), this.totalHosts)];
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true,
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: this.BASE_URL.split("/wp-json")[0],
        referer: `${this.BASE_URL.split("/wp-json")[0]}/`,
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      }
    }));
  }
  async download(inputUrl) {
    try {
      const formData = new URLSearchParams();
      formData.append("url", inputUrl);
      formData.append("token", "");
      const response = await this.client.post(this.BASE_URL, formData.toString());
      return response.data;
    } catch (error) {
      console.error("Error:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    host
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL parameter is required"
    });
  }
  const hostInt = host ? parseInt(host) : 1;
  const downloader = new AllDownloader(hostInt);
  if (hostInt < 1 || hostInt > downloader.totalHosts) {
    return res.status(400).json({
      error: `Host must be between 1 of ${downloader.totalHosts}.`
    });
  }
  try {
    const result = await downloader.download(url);
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message
    });
  }
}