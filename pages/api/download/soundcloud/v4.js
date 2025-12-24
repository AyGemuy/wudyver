import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class SoundCloudDownloader {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true
    }));
    this.apiUrl = "https://www.soundcloudme.com/downloader";
    this.downloadUrl = "https://dl.soundcloudme.com/sc_.php";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://www.soundcloudme.com",
      referer: "https://www.soundcloudme.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async downloadTrack(link) {
    try {
      const {
        data
      } = await this.client.get("https://www.soundcloudme.com", {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const verifyToken = $("#downloader_verify").val();
      if (!verifyToken) return {
        status: false,
        message: "Verify token missing"
      };
      const formData = `downloader_verify=${verifyToken}&_wp_http_referer=%2F&url=${encodeURIComponent(link)}`;
      const downloadPage = await this.client.post(this.apiUrl, formData, {
        headers: this.headers
      });
      const formDataPage = cheerio.load(downloadPage.data);
      const nonce = formDataPage("#_nonce").val();
      const title = formDataPage('input[name="title"]').val();
      const yt = formDataPage('input[name="yt"]').val();
      const imageUrl = formDataPage("#soundcloud-area img").attr("src");
      if (!nonce || !title || !yt) return {
        status: false,
        message: "Failed to extract form data"
      };
      const postData = new URLSearchParams({
        _nonce: nonce,
        _wp_http_referer: "/downloader",
        action: "download_mp3",
        title: title,
        yt: yt
      }).toString();
      const mediaData = await this.client.post(this.downloadUrl, postData, {
        headers: {
          ...this.headers,
          cookie: this.client.defaults.jar.getCookieStringSync(this.downloadUrl)
        },
        responseType: "arraybuffer"
      });
      return {
        title: title,
        media: Buffer.from(mediaData.data).toString("base64"),
        image: imageUrl
      };
    } catch (error) {
      console.error("Error downloading track:", error);
      return {
        status: false,
        message: "Failed to download track"
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