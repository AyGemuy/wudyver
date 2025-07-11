import axios from "axios";
import * as cheerio from "cheerio";
class Animasu {
  async search({
    query = ""
  }) {
    const url = `https://v9.animasu.cc/?s=${encodeURIComponent(query)}`;
    const {
      data
    } = await axios.get(url);
    const $ = cheerio.load(data);
    const results = $(".listupd .bsx").map((_, el) => {
      const a = $(el).find("a");
      const href = a.attr("href") || "";
      const title = a.attr("title") || "";
      const img = a.find("img").attr("src") || "";
      const type = a.find(".typez").text().trim() || "Unknown";
      const status = a.find(".sb").text().trim() || "-";
      const episode = a.find(".epx").text().trim() || "-";
      const name = a.find(".tt").text().trim() || title;
      return {
        title: name,
        type: type,
        status: status,
        episode: episode,
        thumb: img,
        url: href
      };
    }).get();
    return {
      status: true,
      result: results
    };
  }
  async detail({
    url = ""
  }) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const playurl = $(".bixbox.animefull .bigcover .gp").attr("href") || "";
      let playData = null;
      if (playurl) {
        playData = await this.download({
          url: playurl
        });
      }
      return {
        title: $('h1[itemprop="headline"]').text().trim() || "No title",
        altTitle: $(".alter").text().trim() || "No alternative title",
        description: $(".sepele").text().trim() || "No description",
        synopsis: $(".sinopsis .desc").text().trim() || "No synopsis",
        genres: $('.spe a[href*="/genre/"]').map((i, el) => $(el).text().trim()).get() || ["No genres"],
        status: $('.spe b:contains("Status:")').parent().text().replace("Status:", "").trim() || "No status",
        release: $('.spe .split b:contains("Rilis:")').parent().text().replace("Rilis:", "").trim() || "No release date",
        type: $('.spe b:contains("Jenis:")').parent().text().replace("Jenis:", "").trim() || "No type",
        duration: $('.spe b:contains("Durasi:")').parent().text().replace("Durasi:", "").trim() || "No duration",
        studio: $('.spe a[href*="/studio/"]').text().trim() || "No studio",
        rating: $(".rating strong").text().replace("Rating", "").trim() || "No rating",
        image: $(".bixbox.animefull .bigcover .ime img").attr("data-lazy-src")?.replace(/^\/\//, "https://") || "No image",
        download: $(".soraurlx").map((_, elem) => ({
          quality: $(elem).find("strong").text().trim(),
          url: $(elem).find("a").map((__, link) => $(link).attr("href")).get() || ["No download links"]
        })).get(),
        trailer: $(".bixbox.trailer iframe").attr("src") || "No trailer",
        playData: playData
      };
    } catch (err) {
      return {
        error: true,
        message: err.message
      };
    }
  }
  decodeBase64(encoded) {
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const $ = cheerio.load(decoded);
      return $("iframe").attr("src") || null;
    } catch {
      return null;
    }
  }
  async download({
    url = ""
  }) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const meta = $(".item.meta");
      const get = sel => meta.find(sel);
      const text = sel => get(sel).text().trim();
      const attr = (sel, val) => get(sel).attr(val);
      const imgSrc = get("img").attr("data-lazy-src");
      const image = imgSrc?.startsWith("//") ? "https:" + imgSrc : imgSrc || "";
      const mirrors = [];
      $("select.mirror option").each((_, el) => {
        const src = this.decodeBase64($(el).attr("value"));
        if (src) mirrors.push({
          quality: $(el).text().trim(),
          src: src
        });
      });
      return {
        title: text('h1[itemprop="name"]'),
        animeName: text(".epx a"),
        animeLink: attr(".epx a", "href") || "",
        subtitle: text(".epx .lg"),
        image: image,
        width: attr('meta[itemprop="width"]', "content") || "",
        height: attr('meta[itemprop="height"]', "content") || "",
        year: text(".year"),
        source: text(".year a"),
        mirrors: mirrors
      };
    } catch (err) {
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const animasu = new Animasu();
  try {
    switch (action) {
      case "search":
        if (query) {
          const searchResult = await animasu.search({
            query: query
          });
          return res.status(200).json(searchResult);
        } else {
          return res.status(400).json({
            error: "Query is required for search"
          });
        }
      case "detail":
        if (url) {
          const detailResult = await animasu.detail({
            url: url
          });
          return res.status(200).json(detailResult);
        } else {
          return res.status(400).json({
            error: "Url is required for search"
          });
        }
      case "download":
        if (url) {
          const downloadResult = await animasu.download({
            url: url
          });
          return res.status(200).json(downloadResult);
        } else {
          return res.status(400).json({
            error: "Url is required for search"
          });
        }
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}