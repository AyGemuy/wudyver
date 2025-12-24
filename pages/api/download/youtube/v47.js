import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData
} from "formdata-node";
import {
  WebSocket
} from "ws";
class Y2MateDownloader {
  constructor() {
    this.cookies = {};
    this.client = axios.create();
    this.client.interceptors.response.use(response => {
      const setCookie = response.headers["set-cookie"];
      if (setCookie) {
        setCookie.forEach(cookie => {
          const [key, value] = cookie.split(";")[0].split("=").map(s => s.trim());
          if (key && value) {
            this.cookies[key] = value;
          }
        });
      }
      return response;
    });
  }
  getCookieString() {
    return Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
  }
  getTTLFromQuality(quality) {
    const pixels = parseInt(quality.toLowerCase().replace("p", ""), 10);
    const baseTTL = 1e4;
    return pixels * baseTTL;
  }
  getExtFromUrl(url) {
    try {
      const decodedUrl = decodeURIComponent(url);
      const mime = new URL(decodedUrl).searchParams.get("mime");
      return mime ? mime.split("/").pop() : "mp4";
    } catch (e) {
      return "mp4";
    }
  }
  async download({
    url,
    quality = "360p"
  }) {
    console.log("Mulai mengunduh...");
    try {
      console.log("Mengambil data awal...");
      const headers = {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "max-age=0",
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://y2mate.online",
        referer: "https://y2mate.online/",
        "user-agent": "mozilla/5.0 (linux; android 10) applewebkit/537.36 (khtml, like gecko) chrome/131.0.0.0 mobile safari/537.36",
        cookie: this.getCookieString()
      };
      const response = await this.client.post("https://y2mate.online/process/", `videoURL=${encodeURIComponent(url)}`, {
        headers: headers
      });
      let html = response.data;
      const startTime = Date.now();
      const timeout = 1e4;
      while (!html.includes('<div class="format-section">') && Date.now() - startTime < timeout) {
        console.log("Menunggu format tersedia...");
        await new Promise(resolve => setTimeout(resolve, 500));
        const retry = await this.client.post("https://y2mate.online/process/", `videoURL=${encodeURIComponent(url)}`, {
          headers: headers
        });
        html = retry.data;
      }
      if (!html.includes('<div class="format-section">')) {
        throw new Error("Gagal mengambil daftar format setelah waktu tunggu.");
      }
      const $ = cheerio.load(html);
      const nonceMatch = html.match(/formData\.append\('nonce',\s*'([^']*)'\);/);
      const nonce = nonceMatch ? nonceMatch[1] : null;
      const videoId = $('input[name="video_id"]').val();
      const title = $(".videoTitle").attr("title");
      console.log("Info Video:", {
        title: title,
        videoId: videoId,
        nonce: nonce
      });
      const mediaList = [];
      $(".format-section tbody tr").each((_, el) => {
        const $el = $(el);
        const downloadUrl = $el.find("td").attr("data-url");
        const quality = $el.find("td").attr("data-quality");
        const size = $el.find("td").attr("data-size");
        const formatText = $el.find("td > div:first-child").text().trim() || $el.find("td").clone().children().remove().end().text().trim();
        if (formatText && quality && size) {
          const sizeMatch = size.match(/([\d.]+)([A-Za-z]+)/);
          let parsedSize = 0;
          if (sizeMatch) {
            const value = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2].toLowerCase();
            if (unit.includes("mb")) parsedSize = value;
            else if (unit.includes("gb")) parsedSize = value * 1024;
          }
          mediaList.push({
            url: downloadUrl,
            format: formatText,
            quality: quality,
            size: size,
            parsedSize: parsedSize
          });
        }
      });
      console.log("Daftar Media:", mediaList);
      const selectedMedia = mediaList.find(item => item.quality.toLowerCase().includes(quality.toLowerCase()));
      if (!selectedMedia) {
        const availableFormats = mediaList.map(item => `- ${item.format}, Kualitas: ${item.quality}, Ukuran: ${item.size}`).join("\n");
        console.log(`Format yang tersedia:\n${availableFormats}`);
        throw new Error(`Format "${quality}" tidak ditemukan. Format yang tersedia:\n${availableFormats}`);
      }
      console.log(`Memilih format: ${selectedMedia.format}, Kualitas: ${selectedMedia.quality}, Ukuran: ${selectedMedia.size}`);
      const ttl = this.getTTLFromQuality(quality);
      const formData = new FormData();
      formData.append("action", "process_video_merge");
      formData.append("nonce", nonce);
      formData.append("request_data", JSON.stringify({
        id: `${videoId}_${quality}`,
        ttl: ttl,
        inputs: [{
          url: selectedMedia.url,
          ext: this.getExtFromUrl(selectedMedia.url)
        }],
        output: {
          ext: this.getExtFromUrl(selectedMedia.url),
          downloadName: `Y2mate.online_${title}_${quality}.${this.getExtFromUrl(selectedMedia.url)}`
        },
        operation: {
          type: "replace_audio_in_video"
        }
      }));
      console.log("Memproses video...");
      const processResponse = await this.client.post("https://y2mate.online/wp-admin/admin-ajax.php", formData, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "content-type": "multipart/form-data",
          origin: "https://y2mate.online",
          referer: "https://y2mate.online/process/",
          "user-agent": "mozilla/5.0 (linux; android 10) applewebkit/537.36 (khtml, like gecko) chrome/131.0.0.0 mobile safari/537.36",
          "x-wp-nonce": nonce,
          cookie: this.getCookieString()
        }
      });
      if (!processResponse.data) {
        throw new Error(processResponse.data?.message || "Gagal memproses video.");
      }
      console.log("Mengambil info server...");
      const serverResponse = await this.client.get("https://balancer.fastytcdn.com/get-server", {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          origin: "https://y2mate.online",
          referer: "https://y2mate.online/",
          "user-agent": "mozilla/5.0 (linux; android 10; k) applewebkit/537.36 (khtml, like gecko) chrome/131.0.0.0 mobile safari/537.36",
          cookie: this.getCookieString()
        }
      });
      const wsServer = serverResponse.data;
      const wsUrl = `wss://${wsServer}/pub/render/status_ws/${videoId}_${quality}`;
      console.log("Menghubungkan ke WebSocket...", {
        wsUrl: wsUrl
      });
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl, {
          origin: "https://y2mate.online",
          headers: {
            upgrade: "websocket",
            connection: "upgrade",
            "sec-websocket-key": btoa("jTzUqVV2PzLcFGhnX78L4g=="),
            "sec-websocket-version": "13",
            "user-agent": "mozilla/5.0 (linux; android 10; k) applewebkit/537.36 (khtml, like gecko) chrome/131.0.0.0 mobile safari/537.36",
            cookie: this.getCookieString()
          }
        });
        ws.on("open", () => console.log("WebSocket terhubung"));
        let downloadUrl;
        ws.on("message", data => {
          try {
            const message = JSON.parse(data.toString());
            console.log("Pesan WebSocket:", message);
            if (message.status === "done") {
              downloadUrl = message.output;
              console.log("URL Unduhan:", downloadUrl);
              ws.close();
              resolve(downloadUrl);
            } else if (message.error) {
              console.error("Error WebSocket:", message.error);
              ws.close();
              reject(new Error(message.error));
            } else {
              console.log("Progres:", message.progress_in_percent, "%");
            }
          } catch (error) {
            console.error("Error parsing pesan WebSocket:", error);
            ws.close();
            reject(error);
          }
        });
        ws.on("close", () => {
          console.log("WebSocket ditutup");
          if (!downloadUrl) {
            reject(new Error("WebSocket ditutup sebelum menerima URL unduhan."));
          }
        });
        ws.on("error", error => {
          console.error("Error WebSocket:", error);
          reject(error);
        });
      });
    } catch (error) {
      console.error("Gagal mengunduh:", error);
      throw error;
    } finally {
      console.log("Proses selesai.");
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new Y2MateDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}