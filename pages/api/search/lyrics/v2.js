import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
class Lirik {
  constructor() {
    this.randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
  }
  async search(song) {
    try {
      const {
        data
      } = await axios.get(this.randomProxyUrl + encodeURIComponent(`https://www.lyrics.com/lyrics/${encodeURIComponent(song)}`));
      const $ = cheerio.load(data);
      const result = $(".best-matches .bm-case").map((i, element) => {
        const title = $(element).find(".bm-label a").first().text();
        const artist = $(element).find(".bm-label a").last().text();
        const album = $(element).find(".bm-label").eq(1).text().trim().replace(/\s+/g, " ");
        const imageUrl = $(element).find(".album-thumb img").attr("src");
        const link = $(element).find(".bm-label a").first().attr("href");
        return {
          title: title,
          artist: artist,
          album: album,
          imageUrl: imageUrl,
          url: `https://www.lyrics.com${link}`
        };
      }).get();
      return result;
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
      const artistImage = $("#featured-artist-avatar img").attr("src");
      const about = $(".artist-meta .bio").text().trim();
      const year = $('.lyric-details dt:contains("Year:") + dd').text().trim();
      const playlists = $('.lyric-details dt:contains("Playlists") + dd a').text().trim();
      const lyrics = $("#lyric-body-text").text().trim();
      return {
        artistImage: artistImage,
        about: about,
        year: year,
        playlists: playlists,
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
    switch (action) {
      case "search":
        if (!query) {
          return res.status(400).json({
            error: "Query parameter is required for search."
          });
        }
        const songs = await lirik.search(query);
        return res.status(200).json({
          result: songs
        });
      case "lyrics":
        if (!url) {
          return res.status(400).json({
            error: "URL parameter is required for lyrics."
          });
        }
        const lyrics = await lirik.lyrics(url);
        return res.status(200).json({
          result: lyrics
        });
      default:
        if (query) {
          const searchResults = await lirik.search(query);
          if (searchResults.length === 0) {
            return res.status(404).json({
              error: "No songs found."
            });
          }
          const songLyrics = await lirik.lyrics(searchResults[0].url);
          return res.status(200).json({
            song: searchResults[0],
            lyrics: songLyrics
          });
        }
        return res.status(400).json({
          error: "Invalid request. Provide an action, query, or URL."
        });
    }
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({
      error: "Internal Server Error."
    });
  }
}