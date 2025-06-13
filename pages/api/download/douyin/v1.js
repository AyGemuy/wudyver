import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class SavetikAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    this.csrfToken = "";
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
  }
  async fetchCsrfToken(url) {
    try {
      const response = await this.client.get(url, {
        headers: {
          "user-agent": this.userAgent
        }
      });
      const csrfMatch = response.data.match(/<meta name="csrf-token" content="([^"]+)">/);
      if (csrfMatch && csrfMatch[1]) {
        this.csrfToken = csrfMatch[1];
        console.log("CSRF Token:", this.csrfToken);
      } else {
        console.warn("CSRF token not found in meta tag, attempting to extract from other source");
        const cookieString = await this.cookieJar.getCookieString(url);
        const csrfCookieMatch = /XSRF-TOKEN=([^;]+)/.exec(cookieString);
        if (csrfCookieMatch && csrfCookieMatch[1]) {
          this.csrfToken = decodeURIComponent(csrfCookieMatch[1]);
          console.log("CSRF Token from Cookie:", this.csrfToken);
        } else {
          console.warn("CSRF token not found.  API requests may fail.");
        }
      }
    } catch (error) {
      console.error("Error fetching CSRF token:", error);
      throw error;
    }
  }
  async ajaxSearch(url, videoUrl) {
    try {
      if (!this.csrfToken) {
        await this.fetchCsrfToken("https://savetik.co/vi/douyin-downloader");
      }
      const response = await this.client.post(url, `q=${encodeURIComponent(videoUrl)}&lang=vi&cftoken=${this.csrfToken}`, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: "https://savetik.co",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://savetik.co/vi/douyin-downloader",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": this.userAgent,
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const $ = cheerio.load(response.data.data);
      const videoTitle = $("div.video-data h3").text().trim();
      const thumbnailUrl = $("div.thumbnail img").attr("src");
      const downloadLinks = $("div.dl-action a").map((index, element) => {
        const link = $(element).attr("href");
        const text = $(element).text().trim();
        return {
          text: text,
          link: link
        };
      }).get();
      return {
        status: "ok",
        videoTitle: videoTitle,
        thumbnailUrl: thumbnailUrl,
        downloadLinks: downloadLinks
      };
    } catch (error) {
      console.error("Error in ajaxSearch:", error);
      throw error;
    }
  }
  async download({
    url: videoUrl
  }) {
    try {
      const searchResult = await this.ajaxSearch("https://savetik.co/api/ajaxSearch", videoUrl);
      console.log("Search result:", searchResult);
      if (searchResult) {
        return searchResult;
      } else {
        console.warn("No download URL found in search result.");
        return null;
      }
    } catch (error) {
      console.error("Error during search and download:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const savetikApiInstance = new SavetikAPI();
  try {
    const data = await savetikApiInstance.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during request"
    });
  }
}