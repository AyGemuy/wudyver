import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class TeraBoxResolver {
  constructor() {
    this.cookieJar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    this.baseUrl = "https://www.terabox.com";
  }
  async getSurl(url) {
    if (!/^https?:\/\//.test(url)) return url;
    try {
      const {
        headers
      } = await this.axiosInstance.get(url, {
        maxRedirects: 0,
        validateStatus: s => s >= 300 && s < 400
      });
      return new URL(headers.location).searchParams.get("surl") || url;
    } catch {
      return url;
    }
  }
  async getMediaUrl(url) {
    const mediaId = await this.getSurl(url);
    const webUrl = `${this.baseUrl}/sharing/embed?surl=${mediaId}`;
    try {
      const {
        data: html
      } = await this.axiosInstance.get(webUrl);
      const $ = cheerio.load(html);
      const jsTokenMatch = html.match(/"jsToken":"function%20fn%28a%29%7Bwindow.jsToken%20%3D%20a%7D%3Bfn%28%22([^"]+)%22%29/);
      if (!jsTokenMatch) throw new Error("jsToken tidak ditemukan");
      const {
        data: result
      } = await this.axiosInstance.get(`${this.baseUrl}/api/shorturlinfo?` + new URLSearchParams({
        app_id: "250528",
        web: "1",
        channel: "dubox",
        clienttype: "0",
        jsToken: jsTokenMatch[1],
        shorturl: `1${mediaId}`,
        root: "1"
      }));
      return Promise.all(result.list.filter(item => item.isdir === "0").map(async file => ({
        name: file.server_filename,
        size: this.formatSize(file.size),
        path: file.path || `/${file.server_filename}`,
        downloadLink: await this.getDownloadLink(file, result)
      })));
    } catch (error) {
      throw new Error(`Gagal mengambil media: ${error.message}`);
    }
  }
  async getDownloadLink(file, result) {
    try {
      const {
        data
      } = await this.axiosInstance.get(`${this.baseUrl}/share/download?` + new URLSearchParams({
        app_id: "250528",
        web: "1",
        channel: "dubox",
        clienttype: "0",
        jsToken: result.jsToken,
        shareid: result.shareid,
        uk: result.uk,
        sign: result.sign,
        timestamp: result.timestamp,
        primaryid: result.shareid,
        product: "share",
        nozip: "0",
        fid_list: `[${file.fs_id}]`
      }));
      return data.errno === 0 ? data.dlink : null;
    } catch {
      return null;
    }
  }
  formatSize(bytes) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) bytes /= 1024, i++;
    return `${bytes.toFixed(2)} ${units[i]}`;
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No URL provided"
  });
  try {
    const resolver = new TeraBoxResolver();
    return res.status(200).json(await resolver.getMediaUrl(url));
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}