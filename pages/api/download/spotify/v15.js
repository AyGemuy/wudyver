import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";
class SpotimateDownloader {
  constructor() {
    this.cookies = {};
    this.baseURL = "https://spotimate.app";
    this.agent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false
    });
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID",
      "cache-control": "max-age=0",
      priority: "u=0, i",
      referer: "https://www.google.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "cross-site",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  handleCookies(response) {
    const setCookie = response.headers["set-cookie"];
    if (setCookie) {
      setCookie.forEach(cookie => {
        const [cookieStr] = cookie.split(";");
        const [name, value] = cookieStr.split("=");
        this.cookies[name] = value;
      });
    }
    const cookieHeader = Object.entries(this.cookies).map(([name, value]) => `${name}=${value}`).join("; ");
    return cookieHeader;
  }
  async req(config) {
    try {
      console.log(`Req: ${config.url}`);
      const cookieHeader = Object.keys(this.cookies).length > 0 ? this.handleCookies({
        headers: {}
      }) : "";
      const headers = {
        ...this.headers,
        ...cookieHeader && {
          cookie: cookieHeader
        },
        ...config.headers
      };
      const response = await axios({
        ...config,
        headers: headers,
        httpsAgent: this.agent,
        withCredentials: true
      });
      this.handleCookies(response);
      return response.data;
    } catch (error) {
      console.error("Req error:", error.message);
      if (error.response) {
        this.handleCookies(error.response);
      }
      throw error;
    }
  }
  async getToken() {
    try {
      console.log("Getting token...");
      const html = await this.req({
        method: "GET",
        url: this.baseURL
      });
      const $ = cheerio.load(html);
      const tokenInput = $('input[type="hidden"][name^="_"]').first();
      const tokenName = tokenInput.attr("name");
      const tokenValue = tokenInput.val();
      console.log("Token:", tokenName, tokenValue ? "✓" : "✗");
      return {
        name: tokenName,
        value: tokenValue
      };
    } catch (error) {
      console.error("Token error:", error.message);
      throw error;
    }
  }
  async submitUrl(url) {
    try {
      console.log("Submitting URL...");
      const token = await this.getToken();
      const formData = new URLSearchParams();
      formData.append("url", url);
      formData.append(token?.name || "_KaxSY", token?.value || "6001b3336189c1c427270e8f2e2ca3eb");
      const response = await this.req({
        method: "POST",
        url: `${this.baseURL}/action`,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: this.baseURL
        },
        data: formData.toString()
      });
      if (response?.error && response.errorcode === "error_token") {
        console.log("Token expired, refreshing...");
        this.cookies = {};
        return this.submitUrl(url);
      }
      return response;
    } catch (error) {
      console.error("Submit error:", error.message);
      throw error;
    }
  }
  async getTrackData(data) {
    try {
      console.log("Getting track data...");
      const formData = new URLSearchParams();
      formData.append("data", data.data);
      formData.append("base", data.base);
      formData.append("token", data.token);
      return await this.req({
        method: "POST",
        url: `${this.baseURL}/action/track`,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: this.baseURL
        },
        data: formData.toString()
      });
    } catch (error) {
      console.error("Track data error:", error.message);
      throw error;
    }
  }
  extractFormData($) {
    const data = $('input[name="data"]').val();
    const base = $('input[name="base"]').val();
    const token = $('input[name="token"]').val();
    if (!data || !token) {
      console.log("Debug - Page content:", $.html().substring(0, 500));
      console.log("Form inputs found:", {
        data: !!data,
        base: !!base,
        token: !!token
      });
      throw new Error("Failed to extract form data - mungkin token expired");
    }
    return {
      data: data,
      base: base,
      token: token
    };
  }
  extractMetadata($) {
    return {
      title: $(".hover-underline").text().trim() || "Unknown Title",
      artist: $(".spotifymate-middle p span").first().text().trim() || "Unknown Artist",
      album: $(".spotifymate-middle p span").eq(1)?.text().trim() || "Unknown Album",
      cover: $(".spotifymate-left img").attr("src") || "",
      duration: $(".grid-text span").first().text().trim() || "Unknown Duration"
    };
  }
  extractMediaLinks($) {
    const media = [];
    $(".abuttons a").each((i, el) => {
      const $el = $(el);
      const href = $el.attr("href");
      const text = $el.text().trim();
      if (href?.includes("/dl?")) {
        media.push({
          url: `${this.baseURL}${href}`,
          type: text.includes("Mp3") ? "audio" : text.includes("Cover") ? "image" : "unknown",
          quality: text.includes("HD") ? "hd" : "standard",
          description: text
        });
      }
    });
    return media;
  }
  async download({
    url
  }) {
    try {
      console.log("Starting download...");
      const submitResponse = await this.submitUrl(url);
      if (submitResponse?.error) {
        throw new Error(`Server error: ${submitResponse.message}`);
      }
      const $1 = cheerio.load(submitResponse?.html || "");
      const formData = this.extractFormData($1);
      const trackResponse = await this.getTrackData(formData);
      if (trackResponse?.error) {
        throw new Error(`Track error: ${trackResponse.message}`);
      }
      const $2 = cheerio.load(trackResponse?.data || "");
      const result = {
        metadata: this.extractMetadata($2),
        media: this.extractMediaLinks($2)
      };
      console.log("Download completed ✓");
      return result;
    } catch (error) {
      console.error("Download error:", error.message);
      this.cookies = {};
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
    const downloader = new SpotimateDownloader();
    const response = await downloader.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}