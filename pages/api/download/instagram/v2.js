import axios from "axios";
import * as cheerio from "cheerio";
class Igsty {
  constructor() {
    this.base = "https://igsty.com";
    this.api = {
      index: "/api/v1/aio/index",
      search: "/api/v1/aio/search"
    };
    this.headers = {
      "user-agent": "Postify/1.0.0",
      origin: "https://igsty.com",
      referer: "https://igsty.com/id/"
    };
  }
  async getPrefix() {
    try {
      const response = await axios.get(`${this.base}${this.api.index}?s=igsty.com`, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      return $('input[name="prefix"]').val();
    } catch (error) {
      return null;
    }
  }
  valid(url) {
    const regex = /instagram\.com\/(p|reel|tv|stories)\/[\w-]+/;
    return regex.test(url);
  }
  async download(ig, prepik = null) {
    let result = {
      result: []
    };
    if (!ig || ig.trim() === "") {
      result.error = "Link IG nya mana???";
      return result;
    }
    if (!this.valid(ig)) {
      result.error = "Link IGnya kagak valid.";
      return result;
    }
    try {
      let prefix = prepik;
      if (!prefix) {
        prefix = await this.getPrefix();
        if (!prefix) {
          result.error = "Prefix tidak ditemukan.";
          return result;
        }
      }
      const data = new URLSearchParams({
        prefix: prefix,
        vid: ig
      });
      const response = await axios.post(`${this.base}${this.api.search}`, data, {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded",
          "hx-target": "aio-parse-result",
          "hx-trigger": "search-btn"
        }
      });
      const $ = cheerio.load(response.data);
      $(".row.align-center").each((index, element) => {
        let title = $(element).find(".text strong:first").text().trim();
        title = title.replace(/^Title：/, "").trim();
        if (title.toLowerCase() === "instagram") {
          title = "";
        }
        const owner = $(element).find(".text strong:eq(1)").next().text().trim();
        const thumbnail = $(element).find("img").attr("src");
        const images = [];
        const videos = [];
        $(element).find("a.button").each((i, el) => {
          const a = $(el).text().replace(/\s+/g, " ").trim();
          const b = $(el).attr("href");
          if (a.toLowerCase().includes("image")) {
            images.push({
              link: b
            });
          } else if (a.toLowerCase().includes("download") && !b.startsWith("javascript:")) {
            const resox = a.match(/\((\d+)-(\d+)p\)/);
            let reso = null;
            if (resox) {
              reso = `${resox[1]}x${resox[2]}p`;
            }
            videos.push({
              link: b,
              reso: reso
            });
          }
        });
        result.result.push({
          title: title,
          owner: owner,
          thumbnail: thumbnail,
          images: images,
          videos: videos
        });
      });
      if (result.result.length === 0) {
        result.error = "Data tidak ditemukan, mungkin sudah dihapus atau di private.";
      }
      return result;
    } catch (error) {
      result.error = "Terjadi kesalahan.";
      return result;
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    prefix
  } = req.query;
  if (!url) {
    return res.status(400).json({
      error: "Link IG tidak ditemukan."
    });
  }
  try {
    const igsty = new Igsty();
    const result = await igsty.download(url, prefix);
    if (result.error) {
      return res.status(400).json({
        error: result.error
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Terjadi kesalahan dalam memproses permintaan."
    });
  }
}