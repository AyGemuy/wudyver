import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class UgoiraDownloader {
  constructor() {
    this.client = axios.create({
      baseURL: "https://ugoira.com",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID",
        "Content-Type": "application/json",
        Origin: "https://ugoira.com",
        Priority: "u=1, i",
        Referer: "https://ugoira.com/",
        "Sec-Ch-Ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      },
      timeout: 3e4,
      validateStatus: status => status >= 200 && status < 500
    });
    this.client.interceptors.request.use(config => {
      console.log(`Making request to: ${config.url}`);
      return config;
    }, error => {
      console.error("Request error:", error.message);
      return Promise.reject(error);
    });
    this.client.interceptors.response.use(response => {
      console.log(`Received response with status: ${response.status}`);
      return response;
    }, error => {
      console.error("Response error:", error.message);
      return Promise.reject(error);
    });
  }
  parseIds(input) {
    try {
      let result = {
        illust: [],
        author: [],
        novel: []
      };
      if (!input || typeof input !== "string" && typeof input !== "number") {
        console.warn("Input tidak valid untuk parsing ID");
        return result;
      }
      const text = String(input).replace(/-_-/g, " ").replace(/www\./gi, "").replace(/pixiv\.net\//gi, "https://pixiv.net/").replace(/https:\/\/https:\/\//gi, "https://").replace(/http:\/\//gi, "https://").replace(/https:\/\//gi, "\nhttps://").replace(/ {2}/g, " ").replace(/\+/g, " ").replace(/\-/g, " ").replace(/ /g, "\n").replace(/\/en/gi, "");
      const lines = text.split("\n");
      lines.forEach(line => {
        if (!line.trim()) return;
        try {
          const url = new URL(line);
          if (url.hostname !== "pixiv.net") return;
          const path = url.pathname;
          if (path.startsWith("/artworks/") || path.startsWith("/i/")) {
            const parts = path.split("/");
            const id = parseInt(parts[parts.length - 1]);
            if (!isNaN(id)) result.illust.push(id);
            return;
          } else if (path.startsWith("/member_illust.php")) {
            const illustId = parseInt(url.searchParams.get("illust_id"));
            if (!isNaN(illustId)) result.illust.push(illustId);
            return;
          } else if (path.startsWith("/novel/show.php")) {
            const novelId = parseInt(url.searchParams.get("id"));
            if (!isNaN(novelId)) result.novel.push(novelId);
            return;
          } else if (path.startsWith("/users/") || path.startsWith("/u/")) {
            const parts = path.split("/");
            const userId = parseInt(parts[parts.length - 1]);
            if (!isNaN(userId)) result.author.push(userId);
            return;
          }
        } catch (error) {
          console.debug(`Baris "${line}" bukan URL yang valid: ${error.message}`);
        }
        const cleanLine = line.replace("#", "").replace("id=", "").replace("id", "").replace("=", "");
        if ((cleanLine.length === 8 || cleanLine.length === 9) && !isNaN(Number(cleanLine))) {
          const id = Number(cleanLine);
          result.illust.push(id);
        }
      });
      console.log(`Berhasil memparse ${result.illust.length} illust ID, ${result.author.length} author ID, ${result.novel.length} novel ID`);
      return result;
    } catch (error) {
      console.error("Error dalam parseIds:", error.message);
      return {
        illust: [],
        author: [],
        novel: []
      };
    }
  }
  async download({
    url,
    limit = 5,
    ...rest
  } = {}) {
    try {
      console.log("Memulai proses download dengan parameter:", {
        url: url,
        limit: limit,
        ...rest
      });
      const inputText = url || rest.text || rest.id;
      if (!inputText) {
        throw new Error("Input teks atau URL diperlukan");
      }
      const ids = this.parseIds(inputText);
      if (ids.illust.length === 0) {
        throw new Error("Tidak ada ID illust yang valid ditemukan");
      }
      const illustIds = limit ? ids.illust.slice(0, limit) : ids.illust;
      console.log(`Menggunakan ${illustIds.length} illust ID:`, illustIds);
      const response = await this.client.post("/api/illusts/queue", {
        text: illustIds.join(" ")
      });
      if (!response.data) {
        throw new Error("Tidak ada data yang diterima dari server");
      }
      if (response.data?.ok === false) {
        throw new Error(`Server mengembalikan error: ${response.data.message || "Tidak diketahui"}`);
      }
      if (response.data?.uk) {
        console.warn("Response mengandung UK warning:", response.data.uk);
      }
      const result = {
        ...response.data
      };
      delete result.ok;
      console.log("Download berhasil, jumlah data yang diterima:", Array.isArray(result.data) ? result.data.length : "unknown");
      return result;
    } catch (error) {
      console.error("Error dalam proses download:", error.message);
      if (error.code === "ECONNABORTED") {
        throw new Error(`Timeout: Permintaan melebihi batas waktu (${error.message})`);
      }
      if (error.response?.status) {
        throw new Error(`HTTP Error ${error.response.status}: ${error.message}`);
      }
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const downloader = new UgoiraDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}