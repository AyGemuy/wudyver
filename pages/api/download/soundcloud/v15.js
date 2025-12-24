import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
class SCDL {
  constructor() {
    this.url = "https://soundloadmate.com";
    this.cookiejat = new Map();
    this.ax = axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        origin: this.url,
        priority: "u=1, i",
        referer: `${this.url}/en1`,
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      }
    });
    this.ax.interceptors.response.use(res => {
      const cookies = res.headers["set-cookie"] || [];
      cookies.forEach(c => this.cookiejat.set(c.split("=")[0], c));
      return res;
    }, err => {
      console.error("Axios error:", err.message);
      return Promise.reject(err);
    });
  }
  async getPage() {
    try {
      console.log("Fetching initial page...");
      const res = await this.ax.get(`${this.url}/en1`);
      const $ = cheerio.load(res.data);
      const inputs = {};
      $('form[name="formurl"] input[type="hidden"]').each((i, el) => {
        inputs[$(el).attr("name")] = $(el).val() || "";
      });
      return {
        action: "/action.php",
        inputs: inputs
      };
    } catch (e) {
      console.error("Error in getPage:", e.message);
      throw new Error("Failed to load initial page");
    }
  }
  async submitURL(u) {
    try {
      console.log("Submitting URL...");
      const {
        action,
        inputs
      } = await this.getPage();
      const fd = new FormData();
      Object.entries(inputs).map(([k, v]) => fd.append(k, v));
      fd.append("url", u);
      const res = await this.ax.post(`${this.url}${action}`, fd, {
        headers: {
          ...fd.getHeaders(),
          cookie: [...this.cookiejat.values()].join("; ")
        }
      });
      return this.parseInfo(res.data?.html);
    } catch (e) {
      console.error("Error in submitURL:", e.message);
      throw new Error("Failed to submit URL");
    }
  }
  parseInfo(h) {
    try {
      const $ = cheerio.load(h);
      const info = {
        title: $(".soundcloudmate-middle h3 div").text().trim() || $(".soundcloudmate-middle h3").text().trim(),
        artist: $(".soundcloudmate-middle p span").eq(0).text().trim(),
        cover: $(".soundcloudmate-left img").attr("src") || "",
        data: {}
      };
      $('form[name="submitapurl"] input[type="hidden"]').each((i, el) => {
        info.data[$(el).attr("name")] = $(el).val() || "";
      });
      if (!info.title || !Object.keys(info.data).length) {
        throw new Error("Failed to parse track info");
      }
      return info;
    } catch (e) {
      console.error("Error in parseInfo:", e.message);
      throw new Error("Failed to parse track information");
    }
  }
  async getDL(track) {
    try {
      console.log("Getting download links...");
      const fd = new FormData();
      Object.entries(track.data).map(([k, v]) => fd.append(k, v));
      const res = await this.ax.post(`${this.url}/action/track`, fd, {
        headers: {
          ...fd.getHeaders(),
          cookie: [...this.cookiejat.values()].join("; ")
        }
      });
      return this.parseDL(res.data?.data);
    } catch (e) {
      console.error("Error in getDL:", e.message);
      throw new Error("Failed to get download links");
    }
  }
  parseDL(h) {
    try {
      const $ = cheerio.load(h);
      const links = {};
      $(".soundcloudmate-right a").each((i, el) => {
        const t = $(el).find("span span").text().trim();
        const href = $(el).attr("href") || "";
        if (/Download Mp3/i.test(t)) links.mp3 = href;
        if (/Download Cover/i.test(t)) links.cover = href;
        if (/Download Android App/i.test(t)) links.app = href;
      });
      if (!links.mp3) {
        throw new Error("No MP3 download link found");
      }
      return links;
    } catch (e) {
      console.error("Error in parseDL:", e.message);
      throw new Error("Failed to parse download links");
    }
  }
  async download({
    url: u
  }) {
    try {
      console.log(`Processing URL: ${u}`);
      const track = await this.submitURL(u);
      const dl = await this.getDL(track);
      return {
        meta: {
          title: track.title,
          artist: track.artist,
          cover: track.cover
        },
        downloads: dl
      };
    } catch (e) {
      console.error("Error in dl:", e.message);
      throw new Error(`Download failed: ${e.message}`);
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new SCDL();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}