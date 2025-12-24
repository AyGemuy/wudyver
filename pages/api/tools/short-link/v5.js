import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
class LewatVip {
  constructor() {
    console.log("Initializing...");
    this.jar = new CookieJar();
    this.axios = wrapper(axios.create({
      jar: this.jar,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
  }
  async getToken(url) {
    console.log("Fetching token...");
    try {
      const response = await this.axios.get(url);
      const $ = cheerio.load(response.data);
      const token = $('input[name="_token"]').val();
      console.log("Token found:", token);
      return token;
    } catch (error) {
      console.error("Error fetching token:", error?.message ?? "An unknown error occurred");
      return null;
    }
  }
  async short({
    url,
    stats = false,
    domain_id = 1,
    ...rest
  }) {
    return stats ? await this.getStats({
      url: url,
      ...rest
    }) : await this.shorten({
      url: url,
      domain_id: domain_id,
      ...rest
    });
  }
  async shorten({
    url,
    domain_id
  }) {
    const baseUrl = "https://lewat.vip";
    console.log(`Starting shortening process for: ${url}`);
    try {
      const token = await this.getToken(baseUrl);
      if (!token) {
        console.log("Could not retrieve token, aborting.");
        return null;
      }
      const form = new FormData();
      form.append("_token", token);
      form.append("url", url);
      form.append("domain_id", domain_id);
      const response = await this.axios.post(`${baseUrl}/shorten`, form, {
        headers: {
          ...form.getHeaders(),
          origin: baseUrl,
          referer: `${baseUrl}/`
        }
      });
      const $ = cheerio.load(response.data);
      const shortUrl = $('#copy-form-container input[name="url"]')?.val();
      const statsUrl = $('.dropdown-menu a[href*="/stats/"]')?.attr("href");
      const result = {
        short: shortUrl ? `https://${shortUrl}` : "Short URL not found",
        stats: statsUrl ?? "Stats link not found"
      };
      console.log("Shortening successful:", result);
      return result;
    } catch (error) {
      console.error("Error during shortening process:", error?.response?.statusText || error?.message);
      return null;
    }
  }
  async getStats({
    url
  }) {
    console.log(`Fetching stats for: ${url}`);
    try {
      const response = await this.axios.get(url, {
        headers: {
          referer: "https.lewat.vip/"
        }
      });
      const $ = cheerio.load(response.data);
      const clicksText = $(".h2.font-weight-bold.mb-0")?.first()?.text()?.trim();
      const clicks = clicksText ? parseInt(clicksText, 10) : 0;
      const originalLength = $('div.text-truncate:contains("Original link")').parent().find(".align-self-end").text().trim() || "N/A";
      const shortenedLength = $('div.text-truncate:contains("Shortened link")').parent().find(".align-self-end").text().trim() || "N/A";
      const statsData = {
        clicks: isNaN(clicks) ? "Could not parse clicks" : clicks,
        originalLength: originalLength,
        shortenedLength: shortenedLength
      };
      console.log("Stats fetched successfully:", statsData);
      return statsData;
    } catch (error) {
      console.error("Error fetching stats:", error?.response?.statusText || error?.message);
      return null;
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
    const shortener = new LewatVip();
    const response = await shortener.short(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}