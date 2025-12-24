import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  constructor(options) {
    this.baseURL = "https://www.expertstool.com/d.php?url=";
    this.client = axios.create({
      timeout: 3e4,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID",
        referer: "https://www.expertstool.com/snack-video-downloader/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...options?.headers
      }
    });
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`[+] Menerima URL asli: ${url}`);
    try {
      const targetUrl = this.baseURL + encodeURIComponent(url);
      console.log(`[+] Memulai unduhan dari URL target: ${targetUrl}`);
      const response = await this.client.get(targetUrl, {
        ...rest
      });
      const html = response.data;
      const $ = cheerio.load(html);
      console.log("[+] Halaman berhasil diunduh, memulai proses parsing...");
      const mainContent = $("#main");
      const videoSource = mainContent.find("video source")?.attr("src") ?? null;
      const imageSource = mainContent.find("center img")?.attr("src") ?? null;
      const downloadLinks = mainContent.find(".table a").map((i, el) => ({
        url: $(el).attr("href") || undefined,
        text: $(el).text().trim() || "Teks tidak ditemukan",
        format: $(el).closest("tr").find("td:last-child strong").text().trim() || "Format tidak diketahui"
      })).get();
      console.log("[+] Konten berhasil di-parsing.");
      return {
        video: videoSource,
        image: imageSource,
        result: downloadLinks.length > 0 ? downloadLinks : "Tidak ada link unduhan ditemukan"
      };
    } catch (error) {
      console.error(`[!] Terjadi kesalahan: ${error.message}`);
      return {
        error: error.message,
        url: error.config?.url,
        statusCode: error.response?.status
      };
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
    const client = new Downloader();
    const response = await client.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}