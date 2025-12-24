import axios from "axios";
import * as cheerio from "cheerio";
class Retatube {
  constructor(host = 1) {
    const hosts = {
      1: "https://retatube.com",
      2: "https://dingyue.10smt.com"
    };
    this.baseUrl = hosts[host] || hosts[1];
    this.headers = {
      "User-Agent": "Postify/1.0.0"
    };
  }
  async getPrefix() {
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}/api/v1/aio/index?s=retatube.com`, {
        headers: this.headers
      });
      const prefix = cheerio.load(data)('input[name="prefix"]').val();
      if (!prefix) throw new Error("Prefix tidak ditemukan.");
      return prefix;
    } catch (error) {
      throw new Error(`Error mendapatkan prefix: ${error.message}`);
    }
  }
  async requestVideoData(prefix, vidLink) {
    try {
      const params = new URLSearchParams({
        prefix: prefix,
        vid: vidLink
      }).toString();
      const {
        data
      } = await axios.post(`${this.baseUrl}/api/v1/aio/search`, params, {
        headers: {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      const extractData = regex => (data.match(regex) || [])[1] || "";
      const fans = extractData(/<p><strong>Fans：<\/strong>(\d+)/);
      const views = extractData(/<p><strong>Views:：<\/strong>(\d+)/);
      const shares = extractData(/<p><strong>Shares：<\/strong>(\d+)/);
      const $ = cheerio.load(data);
      const results = $("div.icon-box").map((_, element) => {
        const title = $(element).find('strong:contains("Title")').text().replace("Title：", "").trim();
        const owner = $(element).find('strong:contains("Owner")').parent().text().replace("Owner：", "").trim();
        const image = $(element).find("img").attr("src");
        const dlink = $("a.button.primary.expand").map((_, el) => {
          const link = $(el).attr("href");
          if (link === "javascript:void(0);") return null;
          const teks = $(el).find("span").text().replace("Download", "").trim().toLowerCase().replace(/[\(\)]/g, "").replace(/\s+/g, "_").split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
          return {
            title: teks,
            link: link
          };
        }).get().filter(Boolean);
        return {
          title: title,
          owner: owner,
          fans: fans,
          views: views,
          shares: shares,
          image: image,
          dlink: dlink
        };
      }).get();
      return results;
    } catch (error) {
      throw new Error(`Error mendapatkan data: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url: vidLink,
      host
    } = req.method === "GET" ? req.query : req.body;
    if (!vidLink) {
      return res.status(400).json({
        error: "URL tidak boleh kosong."
      });
    }
    const selectedHost = parseInt(host, 10) || 1;
    const retatube = new Retatube(selectedHost);
    const prefix = await retatube.getPrefix();
    const videoData = await retatube.requestVideoData(prefix, vidLink);
    return res.status(200).json({
      success: true,
      data: videoData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}