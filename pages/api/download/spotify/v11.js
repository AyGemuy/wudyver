import axios from "axios";
import {
  FormData
} from "formdata-node";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class DownSpotify {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://downspotify.com",
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        Origin: "https://downspotify.com",
        Referer: "https://downspotify.com/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      },
      jar: this.jar,
      withCredentials: true
    }));
  }
  async getCsrfToken() {
    try {
      await this.client.get("/");
      const cookies = await this.jar.getCookies("https://downspotify.com");
      return cookies.find(c => c.key === "csrf_token")?.value || null;
    } catch {
      return null;
    }
  }
  async download(url) {
    try {
      const csrfToken = await this.getCsrfToken();
      if (!csrfToken) return null;
      const headers = {
        ...this.client.defaults.headers,
        "X-CSRF-Token": csrfToken
      };
      const form = new FormData();
      form.append("url", url);
      const {
        data
      } = await this.client.post("/result.php", form, {
        headers: headers
      });
      const $ = cheerio.load(data);
      const title = $("h3").text();
      const artist = $(".item2 > div > div:nth-child(2)").text();
      const album = $(".item2 > div > div:nth-child(3)").text();
      const thumbnail = $(".item1 img").attr("src");
      const id = $('input[name="id"]').attr("value");
      const previewUrl = $('input[name="previewUrl"]').attr("value");
      if (!id || !title || !previewUrl) return null;
      const downloadForm = new FormData();
      downloadForm.append("previewUrl", decodeURIComponent(previewUrl));
      downloadForm.append("id", id);
      downloadForm.append("title", title);
      downloadForm.append("type", "2");
      const {
        data: downloadData
      } = await this.client.post("/download.php", downloadForm, {
        headers: headers
      });
      const path = downloadData.split("URL=/dl.php?path=")[1]?.split('"')[0];
      return path ? {
        title: title,
        artist: artist,
        album: album,
        thumbnail: thumbnail,
        download: `https://downspotify.com/dl.php?path=${path}`
      } : null;
    } catch {
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing required query parameter: url"
    });
  }
  try {
    const spotify = new DownSpotify();
    const result = await spotify.download(url);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}