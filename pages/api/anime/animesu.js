import fetch from "node-fetch";
import * as cheerio from "cheerio";
class AnimeSu {
  constructor() {
    this.searchUrl = "https://animesu.vip/?s=";
  }
  async search(q) {
    try {
      const {
        data
      } = await axios.get(this.searchUrl + encodeURIComponent(q));
      const $ = cheerio.load(data);
      return $(".a-item").map((i, el) => ({
        title: $(el).find(".judul").text().trim() || "",
        link: $(el).find("a.ml-mask").attr("href") || "",
        image: $(el).find("img.mli-thumb").attr("src") || "",
        type: $(el).find(".fa-file-movie-o").parent().text().trim() || "",
        season: $(el).find(".fa-calendar").parent().text().trim().replace(/.*:/, "") || "",
        description: $(el).find(".mli-desc").text().trim() || ""
      })).get();
    } catch (err) {
      console.error("Error in search:", err.message);
      return [];
    }
  }
  async detail(url) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      return {
        title: $(".mli-info .judul").text().trim() || "",
        image: $(".mli-thumb-wrap img").attr("src") || "",
        releaseSeason: $('.mli-mvi a[rel="tag"]').map((i, el) => $(el).text().trim()).get().join(", ") || "",
        rating: {
          value: $('.mli-mvi span[itemprop="ratingValue"]').text().trim() || "0",
          count: $('.mli-mvi i[itemprop="ratingCount"]').text().trim() || "0"
        },
        credit: $('.mli-mvi:contains("Credit")').text().replace(/Credit\s*:/, "").trim() || "",
        encode: $('.mli-mvi:contains("Encode")').text().replace(/Encode\s*:/, "").trim() || "",
        genres: $('.mli-mvi a[itemprop="genre"]').map((i, el) => $(el).text().trim() || "").get(),
        synopsis: $(".mli-desc").text().trim() || "",
        episodes: $(".tvseason .les-content a").map((i, el) => ({
          title: $(el).text().trim() || "",
          link: $(el).attr("href") || ""
        })).get(),
        trailer: $("iframe").attr("src") || ""
      };
    } catch (err) {
      console.error("Error in detail:", err.message);
      return null;
    }
  }
  async download(url) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      return {
        title: $(".judul").text().trim() || "",
        image: $(".mli-thumb").attr("src") || "",
        info: {
          season: $('.mli-mvi a[rel="tag"]').map((i, el) => $(el).text().trim()).get().join(", ") || "",
          rating: $('span[itemprop="ratingValue"]').text().trim() || "0",
          voters: $('i[itemprop="ratingCount"]').text().trim() || "0",
          credit: $('.mli-mvi:contains("Credit")').next().text().trim().replace(/Credit\s*:/, "") || "",
          encode: $('.mli-mvi:contains("Encode")').next().text().trim().replace(/Encode\s*:/, "") || "",
          genre: $('.mli-mvi:contains("Genre") a').map((i, el) => $(el).text().trim() || "").get()
        },
        synopsis: $(".mli-desc").text().trim() || "",
        downloads: $("div.download-eps ul li").map((i, el) => ({
          resolution: $(el).find("strong").text().trim() || "",
          links: $(el).find("span a").map((i, link) => ({
            source: $(link).text().trim() || "",
            url: $(link).attr("href") || ""
          })).get()
        })).get(),
        recommendations: $(".list-title h2").text().trim() || ""
      };
    } catch (err) {
      console.error("Error in download:", err.message);
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
  const animesu = new AnimeSu();
  try {
    switch (action) {
      case "search":
        if (query) {
          const searchResult = await animesu.search(query);
          return res.status(200).json(searchResult);
        } else {
          return res.status(400).json({
            error: "Query is required for search"
          });
        }
      case "detail":
        if (url) {
          const detailResult = await animesu.detail(url);
          return res.status(200).json(detailResult);
        } else {
          return res.status(400).json({
            error: "Url is required for search"
          });
        }
      case "download":
        if (url) {
          const downloadResult = await animesu.download(url);
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