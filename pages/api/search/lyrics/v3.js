import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
class Lirik {
  constructor() {
    this.randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
  }
  async search(query) {
    try {
      const {
        data
      } = await axios.get(this.randomProxyUrl + encodeURIComponent(`https://www.lirikterjemahan.id/search?q=${encodeURIComponent(query)}`));
      const $ = cheerio.load(data);
      return $(".blog-posts .hentry").map((_, el) => ({
        title: $(el).find(".post-title a").text().trim(),
        url: $(el).find(".post-title a").attr("href"),
        snippet: $(el).find(".post-snippet").text().trim(),
        thumbnail: $(el).find(".post-thumbnail img, .post-thumbnail amp-img").attr("src") || "No image"
      })).get();
    } catch (error) {
      console.error("Error fetching song list:", error);
      return [];
    }
  }
  async lyrics(url) {
    try {
      const {
        data
      } = await axios.get(this.randomProxyUrl + encodeURIComponent(url));
      const $ = cheerio.load(data);
      const title = $(".post-title").text().trim();
      const meaning = $("#arti-makna-lagu").next().text().trim();
      const lyricsSection = $("#lirik-lagu-dan-terjemahan").nextAll("p").map((_, el) => $(el).text().trim()).get();
      const lyrics = lyricsSection.join("\n");
      return {
        title: title,
        meaning: meaning,
        lyrics: lyrics
      };
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      return {
        lyrics: ""
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const lirik = new Lirik();
  try {
    if (action === "search") {
      if (!query) return res.status(400).json({
        error: "Query parameter is required for search."
      });
      const songs = await lirik.search(query);
      return res.status(200).json({
        result: songs
      });
    }
    if (action === "lyrics") {
      if (!url) return res.status(400).json({
        error: "URL parameter is required for lyrics."
      });
      const lyrics = await lirik.lyrics(url);
      return res.status(200).json({
        result: lyrics
      });
    }
    if (query) {
      const songs = await lirik.search(query);
      if (songs.length === 0) return res.status(404).json({
        error: "No songs found."
      });
      const lyrics = await lirik.lyrics(songs[0].url);
      return res.status(200).json({
        song: songs[0],
        lyrics: lyrics
      });
    }
    return res.status(400).json({
      error: "Invalid request. Provide an action, query, or URL."
    });
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({
      error: "Internal Server Error."
    });
  }
}