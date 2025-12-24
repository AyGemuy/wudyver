import axios from "axios";
import * as cheerio from "cheerio";
import SpoofHead from "@/lib/spoof-head";
class SmuleDownloader {
  constructor() {
    this.baseUrl = "https://smuledownloader.online";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded",
      origin: this.baseUrl,
      priority: "u=0, i",
      referer: `${this.baseUrl}/`,
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.axiosInstance = axios.create();
    this._setupInterceptors();
  }
  _setupInterceptors() {
    this.axiosInstance.interceptors.request.use(config => {
      console.log(`[Request] ${config.method.toUpperCase()} ${config.url}`);
      return config;
    }, error => {
      console.error("[Request Error]", error);
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.response.use(response => {
      console.log(`[Response] ${response.status} ${response.config.url}`);
      return response;
    }, error => {
      console.error("[Response Error]", error.message);
      return Promise.reject(error);
    });
  }
  async #extractDownloadInfo($) {
    console.log("[Process] Extracting download information...");
    const resultSection = $("#results");
    if (!resultSection.length) {
      throw new Error("Download results section not found");
    }
    const info = {
      title: resultSection.find(".result-details h4").text().trim(),
      thumbnail: {
        url: resultSection.find(".result-image img").attr("src"),
        alt: resultSection.find(".result-image img").attr("alt")
      },
      downloads: []
    };
    resultSection.find("table tbody tr").each((i, el) => {
      const row = $(el);
      info.downloads.push({
        quality: row.find("td").eq(0).text().trim(),
        format: row.find("td").eq(1).text().trim(),
        url: row.find("a.download-btn").attr("href"),
        buttonText: row.find("a.download-btn").text().trim()
      });
    });
    if (info.downloads.length === 0) {
      throw new Error("No download options found");
    }
    console.log("[Success] Extracted download information");
    return info;
  }
  async #resolveDownloadUrl(url) {
    console.log("[Process] Resolving direct download URL...");
    try {
      const response = await this.axiosInstance.head(url, {
        headers: this.headers,
        maxRedirects: 0,
        validateStatus: null
      });
      if ([301, 302, 307, 308].includes(response.status)) {
        const resolvedUrl = response.headers.location;
        console.log(`[Success] Resolved URL: ${resolvedUrl}`);
        return resolvedUrl;
      }
      return url;
    } catch (error) {
      console.error("[Warning] Failed to resolve URL:", error.message);
      return url;
    }
  }
  async download({
    url: smuleUrl
  }) {
    console.log(`[Init] Starting download process for: ${smuleUrl}`);
    try {
      const encodedUrl = encodeURIComponent(smuleUrl);
      console.log("[Step 1] Submitting to smuledownloader.online...");
      const response = await this.axiosInstance.post(this.baseUrl, `url=${encodedUrl}`, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const info = await this.#extractDownloadInfo($);
      console.log("[Step 2] Processing download options...");
      const downloadOption = info.downloads[0];
      if (!downloadOption.url) {
        throw new Error("No valid download URL found");
      }
      console.log(`[Info] Selected option: ${downloadOption.quality} ${downloadOption.format}`);
      const directUrl = await this.#resolveDownloadUrl(downloadOption.url);
      return {
        title: info.title,
        thumbnail: info.thumbnail,
        downloadUrl: directUrl,
        filename: `${info.title.replace(/[^\w\s]/gi, "").trim() || "smule_download"}.${downloadOption.format.toLowerCase()}`,
        quality: downloadOption.quality,
        format: downloadOption.format,
        rawInfo: info
      };
    } catch (error) {
      console.error("[Error] Download process failed:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) return res.status(400).json({
    error: "Missing required field: url"
  });
  const downloader = new SmuleDownloader();
  try {
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message
    });
  }
}