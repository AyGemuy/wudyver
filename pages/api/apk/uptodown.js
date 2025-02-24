import axios from "axios";
import * as cheerio from "cheerio";
class Uptodown {
  constructor(text) {
    this.baseUrl = "https://id.uptodown.com";
    this.text = text;
  }
  async search() {
    try {
      const response = await axios.post(this.baseUrl + "/android/search", {
        q: this.text
      });
      const $ = cheerio.load(response.data);
      let result = [];
      $(".content .name a").each((_, a) => {
        let _slug = $(a).attr("href");
        let _name = $(a).text().trim();
        result.push({
          name: _name,
          slug: _slug.replace("." + this.baseUrl.replace("https://", "") + "/android", "").replace("https://", "")
        });
      });
      return result;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
  async download() {
    try {
      const response = await axios.get("https://" + this.text + "." + this.baseUrl.replace("https://", "") + "/android");
      const $ = cheerio.load(response.data);
      let image = [];
      let obj = {};
      let v = $(".detail .icon img");
      obj.title = v.attr("alt").replace("Ikon ", "") || "None";
      let slug = $("a.button.last").attr("href");
      obj.version = $(".info .version").text().trim() || "None";
      const downloadData = await this.getDownloadData(slug, obj.version);
      obj.download = downloadData || "None";
      obj.author = $(".autor").text().trim() || "None";
      obj.score = $('span[id="rating-inner-text"]').text().trim() || "None";
      obj.unduhan = $(".dwstat").text().trim() || "None";
      obj.icon = v.attr("src") || "None";
      $(".gallery picture img").each((_, a) => {
        image.push($(a).attr("src"));
      });
      obj.image = image || [];
      obj.desc = $(".text-description").text().trim().split("\n")[0] || "None";
      return obj;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
  async getDownloadData(slug, version) {
    try {
      const response = await axios.get(slug);
      const downloadUrl = `https://dw.uptodown.net/dwn/${load(response.data)(".button-group.download button").attr("data-url")}${version}.apk`;
      const {
        headers
      } = await axios.head(downloadUrl);
      const downloadSize = headers["content-length"];
      return {
        size: downloadSize,
        url: downloadUrl
      };
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const {
    query: text,
    action
  } = req.method === "GET" ? req.query : req.body;
  if (!text || !action) {
    return res.status(400).json({
      error: "text and action parameters are required"
    });
  }
  const uptodown = new Uptodown(text);
  try {
    let result;
    if (action === "search") {
      result = await uptodown.search();
    } else if (action === "download") {
      result = await uptodown.download();
    } else {
      return res.status(400).json({
        error: 'Invalid action. Use "search" or "download".'
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}