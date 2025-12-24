import axios from "axios";
import * as cheerio from "cheerio";
class SoundCloudMP3 {
  constructor() {
    try {
      console.log("Initializing SoundCloudMP3...");
      this.client = axios.create({
        baseURL: "https://soundcloudmp3.org",
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          origin: "https://soundcloudmp3.org",
          referer: "https://soundcloudmp3.org/converter"
        }
      });
      this.client.interceptors.response.use(response => {
        try {
          const cookies = response.headers["set-cookie"];
          if (cookies) {
            console.log("Received cookies:", cookies.length);
            this.client.defaults.headers.common["Cookie"] = cookies.join("; ");
          }
          return response;
        } catch (interceptorError) {
          console.error("Cookie interceptor failed:", interceptorError.message);
          throw interceptorError;
        }
      });
      console.log("Initialization completed successfully");
    } catch (initError) {
      console.error("Initialization failed:", initError.message);
      throw initError;
    }
  }
  async getToken() {
    try {
      console.log("Fetching CSRF token...");
      const {
        data
      } = await this.client.get("/converter");
      const $ = cheerio.load(data);
      const token = $('input[name="_token"]').val();
      if (!token) {
        console.warn("No CSRF token found in page");
        throw new Error("CSRF token not found");
      }
      console.log("Successfully retrieved CSRF token");
      return token;
    } catch (tokenError) {
      console.error("Failed to get CSRF token:", tokenError.message);
      throw tokenError;
    }
  }
  async download({
    url,
    maxRetries = 5,
    delay = 2e3
  }) {
    try {
      console.log(`Starting download process for URL: ${url}`);
      const token = await this.getToken();
      const params = new URLSearchParams();
      params.append("_token", token);
      params.append("url", url);
      params.append("submit", "");
      console.log("Submitting conversion request...");
      const {
        data
      } = await this.client.post("/converter", params.toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      console.log("Parsing initial response...");
      let $ = cheerio.load(data);
      let result = this.parseResult($);
      if (result.result.download) {
        console.log("Download available immediately");
        return result;
      }
      console.log("Beginning polling for download readiness...");
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Polling attempt ${attempt}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          console.log("Checking download status...");
          const {
            data: statusData
          } = await this.client.get("/converter");
          $ = cheerio.load(statusData);
          result = this.parseResult($);
          if (result.result.download) {
            console.log(`Download ready after ${attempt} attempts`);
            return result;
          }
        } catch (pollError) {
          console.error(`Poll attempt ${attempt} failed:`, pollError.message);
          if (attempt === maxRetries) throw pollError;
        }
      }
      throw new Error(`Download not ready after ${maxRetries} attempts`);
    } catch (error) {
      console.error("Download process failed:", error.message);
      throw error;
    }
  }
  parseResult($) {
    try {
      console.log("Parsing result from HTML...");
      const info = $(".info.clearfix").eq(1);
      const pElements = info.find("p");
      let title = "-";
      let duration = "-:-";
      let quality = "-";
      pElements.each((i, el) => {
        const text = $(el).text();
        if (text.includes("Title:")) title = text.replace("Title:", "").trim();
        if (text.includes("Length:")) duration = text.replace("Length:", "").trim();
        if (text.includes("Quality:")) quality = text.replace("Quality:", "").trim();
      });
      let status = "Preparing";
      if ($("#ready-group").length) status = "Ready";
      else if ($("#progress-group").length) status = "In Progress";
      const result = {
        status: true,
        result: {
          title: title,
          duration: duration,
          quality: quality,
          status: status,
          thumbnail: info.find("img").attr("src") || "",
          download: $("#download-btn").attr("href") || "",
          additionalInfo: {
            conversionStatus: $(".conversion-status, #conversion-status").text().trim() || "Unknown",
            isReady: status === "Ready",
            hasBanner: $(".banner_ad").length > 0
          }
        }
      };
      console.log("Successfully parsed result:", result);
      return result;
    } catch (parseError) {
      console.error("Failed to parse result:", parseError.message);
      throw parseError;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new SoundCloudMP3();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}