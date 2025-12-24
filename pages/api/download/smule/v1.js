import axios from "axios";
import * as cheerio from "cheerio";
import SpoofHead from "@/lib/spoof-head";
class Sownloader {
  constructor() {
    this.baseUrl = "https://sownloader.com";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=0, i",
      referer: "https://sownloader.com/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
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
  async #extractInfo($) {
    console.log("[Process] Extracting information from HTML...");
    const info = {
      title: $("h4 a").first().text().trim(),
      description: $("h4 p").first().text().trim(),
      thumbnail: {
        url: $(".sownloader-web-thumbnail").attr("src"),
        alt: $(".sownloader-web-thumbnail").attr("alt"),
        title: $(".sownloader-web-thumbnail").attr("title")
      },
      originalUrl: $("h4 a").attr("href"),
      downloadOptions: $(".btn-block").map((i, el) => {
        const button = $(el);
        return {
          type: button.find("i").attr("class")?.includes("fa-music") ? "audio" : "other",
          text: button.text().trim(),
          href: button.attr("href") ? button.attr("href").startsWith("http") ? button.attr("href") : `${this.baseUrl}${button.attr("href")}` : null,
          onclick: button.attr("onclick") || null,
          isConvert: button.text().includes("MP3")
        };
      }).get(),
      rawHtml: $('section[style*="background-color:#1b1d42"]').html()
    };
    console.log("[Success] Information extracted successfully");
    return info;
  }
  async #getDirectDownloadUrl(audioUrl, filename) {
    console.log("[Process] Getting direct download URL without redirect...");
    try {
      const response = await this.axiosInstance.head(audioUrl, {
        headers: this.headers,
        maxRedirects: 0,
        validateStatus: null
      });
      if (response.status === 302 || response.status === 301) {
        const directUrl = response.headers.location;
        console.log(`[Success] Found direct URL: ${directUrl}`);
        return directUrl;
      }
      console.log("[Info] No redirect found, using original URL");
      return audioUrl;
    } catch (error) {
      console.error("[Warning] Failed to get direct URL, using original:", error.message);
      return audioUrl;
    }
  }
  async download({
    url,
    convert = true
  }) {
    console.log(`[Init] Starting download process for: ${url}`);
    console.log(`[Params] Convert to MP3: ${convert}`);
    try {
      const encodedUrl = encodeURIComponent(url);
      const pageUrl = `${this.baseUrl}/index.php?url=${encodedUrl}`;
      console.log(`[Step 1] Fetching page: ${pageUrl}`);
      const response = await this.axiosInstance.get(pageUrl, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const info = await this.#extractInfo($);
      console.log("[Step 2] Finding download option...");
      const downloadOption = info.downloadOptions.find(option => convert ? option.isConvert : option.type === "audio" && !option.isConvert);
      if (!downloadOption) {
        throw new Error("No matching download option found");
      }
      console.log(`[Success] Found option: ${downloadOption.text}`);
      if (!convert && downloadOption.href) {
        console.log("[Process] Getting direct download link...");
        const directUrl = await this.#getDirectDownloadUrl(downloadOption.href);
        return {
          ...info,
          downloadUrl: directUrl,
          filename: `${info.title || "audio"}.${downloadOption.href.includes(".m4a") ? "m4a" : "mp3"}`,
          converted: false,
          directDownload: true
        };
      }
      console.log("[Process] Preparing conversion...");
      if (!downloadOption.onclick) {
        throw new Error("Convert parameters not found in button");
      }
      const paramsMatch = downloadOption.onclick.match(/convert\('([^']+)',\s*'([^']+)',\s*'([^']+)'\)/);
      if (!paramsMatch || paramsMatch.length < 4) {
        throw new Error("Failed to parse convert parameters");
      }
      const [_, pkey, audioUrl, name] = paramsMatch;
      console.log(`[Info] Conversion params - pkey: ${pkey}, audioUrl: ${audioUrl}, name: ${name}`);
      console.log("[Step 3] Requesting conversion...");
      const convertUrl = `${this.baseUrl}/system/modules/downloader.php`;
      const convertParams = {
        pkey: pkey,
        url: audioUrl,
        name: name,
        ext: "mp3"
      };
      const convertResponse = await this.axiosInstance.get(convertUrl, {
        params: convertParams,
        headers: {
          ...this.headers,
          accept: "*/*",
          "x-requested-with": "XMLHttpRequest",
          referer: pageUrl
        },
        maxRedirects: 0,
        validateStatus: null
      });
      if (convertResponse.status !== 200) {
        throw new Error(`Conversion failed with status ${convertResponse.status}`);
      }
      console.log("[Success] Conversion request successful");
      const downloadData = convertResponse.data;
      if (typeof downloadData === "object" && downloadData.url) {
        console.log("[Info] Found direct download URL in response");
        return {
          ...info,
          downloadUrl: downloadData.url,
          filename: `${name || info.title || "audio"}.mp3`,
          converted: true,
          directDownload: true
        };
      }
      console.log("[Info] No redirect found in conversion response, using audio URL");
      return {
        ...info,
        downloadUrl: audioUrl,
        filename: `${name || info.title || "audio"}.mp3`,
        converted: true,
        directDownload: false
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
  const downloader = new Sownloader();
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