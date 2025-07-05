import axios from "axios";
import * as cheerio from "cheerio";
class Scraper {
  async getCookies() {
    try {
      const response = await axios.get("https://getmyfb.com/id", {
        headers: {
          accept: "*/*",
          "user-agent": "Mozilla/5.0"
        }
      });
      return response.headers["set-cookie"] ? response.headers["set-cookie"].join("; ") : "";
    } catch (error) {
      console.error("Error while fetching cookies:", error.message);
      throw error;
    }
  }
  async postData(cookies, url) {
    try {
      const form = new URLSearchParams({
        id: url,
        locale: "id"
      });
      const response = await axios.post("https://getmyfb.com/process", form, {
        headers: {
          accept: "*/*",
          cookie: cookies,
          "user-agent": "Mozilla/5.0"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error while posting data:", error.message);
      throw error;
    }
  }
  parseHtml(html) {
    try {
      const $ = cheerio.load(html);
      const results = [];
      $("section.results .container").each((_, container) => {
        const text = $(container).find(".results-item-text").text().trim() || "No description available";
        const image = $(container).find(".results-item-image-wrapper img").attr("src") || "default-image.jpg";
        const downloads = $(container).find(".results-list-item").map((_, listItem) => ({
          quality: $(listItem).contents().first().text().trim(),
          link: $(listItem).find("a").attr("href") || "#",
          downloadText: $(listItem).find("a").text().trim() || "Download"
        })).get();
        results.push({
          image: image,
          text: text,
          downloads: downloads
        });
      });
      return results.filter(result => result.downloads.length > 0 && result.text !== "No description available");
    } catch (error) {
      console.error("Error while parsing HTML:", error.message);
      return [];
    }
  }
  extract(quality) {
    try {
      const match = quality.match(/(\d+)/);
      return match ? parseInt(match[0], 10) : 0;
    } catch (error) {
      console.error("Error while extracting quality:", error.message);
      return 0;
    }
  }
  async download({
    url
  }) {
    try {
      const cookies = await this.getCookies();
      const html = await this.postData(cookies, url);
      const results = this.parseHtml(html);
      const singleResult = results.length > 0 ? results[0] : null;
      console.log(JSON.stringify(singleResult, null, 2));
      return singleResult;
    } catch (error) {
      console.error("Error during download process:", error.message);
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
    const scraper = new Scraper();
    const response = await scraper.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}