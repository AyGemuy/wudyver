import axios from "axios";
import * as cheerio from "cheerio";
class VideoDownloader {
  constructor() {
    this.referer = "https://weibomiaopai.com/";
    this.headers = {
      Accept: "*/*",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: this.referer
    };
  }
  async getServerListAndFreeService() {
    try {
      const {
        data
      } = await axios.get(this.referer, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const scriptContent = $("script").map((_, el) => $(el).html()).get().join("\n");
      let serverList = scriptContent.includes("var serverlist = [") ? scriptContent.split("var serverlist = [")[1].split("];")[0].split(",").map(s => s.replace(/['"\s]/g, "").trim()).filter(s => s) : [];
      const selectServers = $("#server option[value]").map((_, el) => $(el).attr("value")).get();
      serverList = [...new Set([...serverList, ...selectServers])].filter(Boolean);
      let freeService = scriptContent.includes("var freeservice=") ? scriptContent.split("var freeservice=")[1].split(";")[0].replace(/['"\s\+]/g, "").trim() : "";
      console.log("Server List:", serverList);
      console.log("Free Service:", freeService);
      return {
        serverList: serverList,
        freeService: freeService
      };
    } catch {
      return null;
    }
  }
  decryptFreeservice(encoded) {
    return Buffer.from([...encoded].filter((_, i) => i % 3 === 1).join(""), "base64").toString("utf-8");
  }
  async fetchVideo(videoUrl, host, freeservice) {
    try {
      const response = await axios.get(`https://${host}/api/video/`, {
        headers: this.headers,
        params: {
          cached: "",
          lang: "ch",
          hash: this.decryptFreeservice(freeservice),
          video: videoUrl
        }
      });
      return response.data;
    } catch {
      return null;
    }
  }
  async getVideo(videoUrl, serverIndex = "all") {
    const {
      serverList,
      freeService
    } = await this.getServerListAndFreeService() || {};
    if (!serverList?.length) return null;
    let selectedServers = serverIndex === "all" ? serverList : !isNaN(serverIndex) && serverIndex >= 0 && serverIndex < serverList.length ? [serverList[serverIndex]] : [];
    if (!selectedServers.length) return console.log("Invalid server index.") || null;
    for (const host of selectedServers) {
      const data = await this.fetchVideo(videoUrl, host, freeService);
      console.log(`✅ Server: ${host} | Data:`, data);
      return data;
    }
    return null;
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      host = 15
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        error: 'Paramenter "url" wajib diisi.'
      });
    }
    const downloader = new VideoDownloader();
    const result = await downloader.getVideo(url, host);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}