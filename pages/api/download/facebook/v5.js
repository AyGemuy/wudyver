import axios from "axios";
import https from "https";
import crypto from "crypto";
import * as cheerio from "cheerio";
import SpoofHead from "@/lib/spoof-head";
class FVDownloader {
  constructor() {
    this.baseURL = "https://fvdownloader.net";
    this.sessionCookies = "";
    this.axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 3e4
    });
    this.axiosInstance.interceptors.request.use(config => {
      const spoofedHeaders = this.buildHeaders(config.headers);
      config.headers = {
        ...config.headers,
        ...spoofedHeaders
      };
      if (this.sessionCookies) {
        config.headers["cookie"] = this.sessionCookies;
      }
      return config;
    }, error => {
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.response.use(response => {
      const setCookieHeaders = response.headers["set-cookie"];
      if (setCookieHeaders) {
        this.sessionCookies = setCookieHeaders.map(s => s.split(";")[0]).join("; ");
      }
      return response;
    }, error => {
      return Promise.reject(error);
    });
    this.defaultHeaders = {
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      priority: "u=1, i",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-requested-with": "XMLHttpRequest"
    };
    this.initializeCookies();
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    return {
      origin: this.baseURL,
      referer: `${this.baseURL}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-request-id": this.randomID(8),
      ...SpoofHead(),
      ...extra
    };
  }
  parseResultHtml(htmlString) {
    const $ = cheerio.load(htmlString);
    const result = {
      title: null,
      thumbnail: null,
      medias: []
    };
    result.title = $('.meta strong:contains("Title:") + a').text().trim() || null;
    result.thumbnail = $("#video-clip img").attr("src") || null;
    $(".meta ul.list-unstyled li a.btn-blue").each((i, el) => {
      const url = $(el).attr("href");
      const quality = $(el).find("small").text().replace(/[()]/g, "").trim();
      if (url && quality) {
        result.medias.push({
          quality: quality,
          url: url
        });
      }
    });
    return result;
  }
  async initializeCookies() {
    try {
      await this.axiosInstance.get(this.baseURL);
    } catch (error) {
      console.error("Error initializing cookies:", error.message);
    }
  }
  async download({
    url,
    ...rest
  }) {
    const data = new URLSearchParams();
    data.append("query", url);
    for (const key in rest) {
      data.append(key, rest[key]);
    }
    if (!data.has("downloader")) {
      data.append("downloader", "video");
    }
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 2e3;
    let attempts = 0;
    let json = null;
    let responseError = null;
    while (attempts < MAX_RETRIES) {
      attempts++;
      try {
        const response = await this.axiosInstance.post(`${this.baseURL}/req`, data.toString(), {
          headers: this.defaultHeaders
        });
        json = response.data;
        if (json && json.html) {
          break;
        } else if (attempts < MAX_RETRIES) {
          console.log(`Attempt ${attempts} failed: HTML content not found. Retrying in ${RETRY_DELAY_MS / 1e3} seconds...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      } catch (error) {
        responseError = `An error occurred during request: ${error.message}`;
        console.error(`Attempt ${attempts} failed: ${responseError}. Retrying in ${RETRY_DELAY_MS / 1e3} seconds...`);
        if (attempts < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }
    let parsedResult = null;
    if (json && json.html) {
      parsedResult = this.parseResultHtml(json.html);
    } else {
      responseError = responseError || "Failed to retrieve HTML content after multiple attempts.";
    }
    return parsedResult;
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
    const scraper = new FVDownloader();
    const response = await scraper.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}