import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class TeraboxAPI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
      Referer: "https://teraboxdownloader.online/"
    };
  }
  async download(videoUrl) {
    try {
      const response = await this.client.post("https://testterabox.vercel.app/api", {
        url: videoUrl
      }, {
        headers: this.headers
      });
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = response.data;
      return {
        medias: [{
          text: json.file_name,
          url: json.direct_link,
          quality: json.size
        }]
      };
    } catch (error) {
      console.error("Error in TeraboxAPI download:", error);
      throw new Error(`Gagal mengunduh video: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      message: "No URL provided"
    });
  }
  const terabox = new TeraboxAPI();
  try {
    const result = await terabox.download(url);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error during download:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}