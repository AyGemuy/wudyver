import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  v4 as uuidv4
} from "uuid";
class SoundCloudDownloader {
  constructor() {
    this.apiUrl = "https://l2tv6fpgy7.execute-api.us-east-1.amazonaws.com/default/free_version_musicverter_python";
    this.baseUrl = "https://www.musicverter.com/";
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://www.musicverter.com",
      priority: "u=1, i",
      referer: "https://www.musicverter.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  generateUserId() {
    return uuidv4();
  }
  async downloadTrack(link) {
    const userId = this.generateUserId();
    try {
      const {
        data
      } = await this.client.get(this.apiUrl, {
        headers: {
          ...this.headers,
          userid: userId
        },
        params: {
          plan_type: "free_downloaded_song",
          link: encodeURIComponent(link)
        }
      });
      return {
        status: true,
        data: data
      };
    } catch (error) {
      console.log(error);
      return {
        status: false,
        message: "Error during conversion"
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new SoundCloudDownloader();
    const result = await downloader.downloadTrack(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}