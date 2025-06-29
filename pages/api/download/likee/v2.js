import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class BotLikeeDownloader {
  constructor() {
    this.url = "https://botdownloader.com/likee-downloader";
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true
    }));
  }
  parseHTML(html) {
    const $ = cheerio.load(html);
    return {
      meta: {
        title: $('meta[name="title"]').attr("content") || $("title").text().trim(),
        description: $('meta[name="description"]').attr("content"),
        keywords: $('meta[name="keywords"]').attr("content")
      },
      content: {
        title: $("section .download_box h1").text().trim(),
        description: $("section .download_box h2").text().trim()
      },
      form: {
        method: $("form#download_form").attr("method"),
        action: $("form#download_form").attr("action"),
        csrfToken: $('form#download_form input[name="csrfmiddlewaretoken"]').val(),
        placeholder: $('form#download_form input[name="download"]').attr("placeholder")
      },
      shareLinks: $(".share_container_item").map((_, el) => ({
        platform: $(el).attr("aria-label"),
        url: $(el).attr("href")
      })).get(),
      video: {
        preview: $("#download_box .down_file_preview video").attr("poster"),
        source: $("#download_box .down_file_preview video").attr("src")
      },
      downloadButtons: $("#download_box .down_file_container a.down_btn").map((_, el) => ({
        label: $(el).text().trim(),
        url: $(el).attr("href")
      })).get(),
      rating: {
        votes: $(".rating_info span").text().trim(),
        stars: $("#stars .star").map((_, el) => ({
          title: $(el).attr("title"),
          value: $(el).data("value")
        })).get()
      }
    };
  }
  async fetchHTML(url) {
    try {
      const {
        data
      } = await this.client.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      return data;
    } catch (error) {
      console.error("Error fetching HTML:", error.message);
      return null;
    }
  }
  async getCsrfToken() {
    const html = await this.fetchHTML(this.url);
    if (!html) return null;
    return cheerio.load(html)('input[name="csrfmiddlewaretoken"]').val();
  }
  async getDownloadLink(csrfToken, videoUrl) {
    try {
      const postData = new URLSearchParams({
        csrfmiddlewaretoken: csrfToken,
        download: encodeURIComponent(videoUrl)
      });
      const {
        data
      } = await this.client.post(this.url, postData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Referer: this.url
        }
      });
      return this.parseHTML(data);
    } catch (error) {
      console.error("Error fetching download link:", error.message);
      return null;
    }
  }
  async download(videoUrl) {
    const csrfToken = await this.getCsrfToken();
    if (!csrfToken) return console.error("CSRF Token not found");
    return await this.getDownloadLink(csrfToken, videoUrl);
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL parameter is required"
    });
  }
  try {
    const downloader = new BotLikeeDownloader();
    const result = await downloader.download(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      status: false,
      error: "Failed to process the URL"
    });
  }
}