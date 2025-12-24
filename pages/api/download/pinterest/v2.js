import axios from "axios";
import * as cheerio from "cheerio";
class PinDownloader {
  constructor(url) {
    this.url = url;
  }
  async getRedirect() {
    try {
      const response = await axios.get(this.url, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      this.url = response.headers.location || this.url;
    } catch (error) {
      this.url = error.response?.headers?.location || this.url;
    }
    return this.url;
  }
  async fetchData() {
    await this.getRedirect();
    try {
      const {
        data
      } = await axios.get("https://www.savepin.app/download.php", {
        params: {
          url: this.url,
          lang: "en",
          type: "redirect"
        }
      });
      return this.parseData(data);
    } catch (error) {
      throw new Error("Error fetching media data: " + error.message);
    }
  }
  parseData(body) {
    const $ = cheerio.load(body);
    const results = [];
    const imageTable = $("table").has('tr:contains("Quality")').first();
    const videoTable = $("table").has('tr:contains("480p")').first();
    if (imageTable.length) {
      this.extractMedia(imageTable, $, results);
    } else if (videoTable.length) {
      this.extractMedia(videoTable, $, results);
    }
    if (results.length === 0) {
      throw new Error("Tidak ada tabel media ditemukan.");
    }
    return {
      results: results
    };
  }
  extractMedia(table, $, results) {
    table.find("tr").each((_, element) => {
      const quality = $(element).find(".video-quality").text();
      const format = $(element).find("td:nth-child(2)").text();
      const downloadLink = $(element).find("a").attr("href");
      if (quality && downloadLink) {
        results.push({
          quality: quality,
          format: format,
          media: "https://www.savepin.app" + downloadLink
        });
      }
    });
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL query parameter is required."
    });
  }
  try {
    const downloader = new PinDownloader(url);
    const result = await downloader.fetchData();
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Error processing request: " + error.message
    });
  }
}