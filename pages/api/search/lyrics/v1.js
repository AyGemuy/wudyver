import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
class Genius {
  constructor() {
    this.GENIUS_API_URL = "https://api.genius.com";
    this.GENIUS_ACCESS_TOKEN = "L0BY-i4ZVi0wQ53vlvm2zucqjHTuLbHv--YgjxJoN0spnEIhb5swTr_mWlQ6Ye-F";
    this.headers = {
      Authorization: `Bearer ${this.GENIUS_ACCESS_TOKEN}`,
      "User-Agent": "apitester.org Android/7.5(641)"
    };
    this.randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
  }
  async search(query) {
    const url = new URL("/search", this.GENIUS_API_URL);
    url.searchParams.append("q", query);
    try {
      const response = await axios.get(this.randomProxyUrl + encodeURIComponent(url.toString()), {
        headers: this.headers
      });
      return response.data.response.hits.filter(e => e.type === "song").map(({
        result
      }) => ({
        title: result.full_title,
        image: result.song_art_image_url,
        url: result.url,
        ...result
      }));
    } catch (error) {
      console.error("Error fetching song list:", error);
      return [];
    }
  }
  async lyrics(url) {
    try {
      const response = await axios.get(`${this.randomProxyUrl}${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      const html = response.data;
      const $ = cheerio.load(html);
      const lyricsRoot = $("#lyrics-root");
      const lyrics = lyricsRoot.find("[data-lyrics-container='true']").map((index, element) => {
        $(element).find("br").replaceWith("\n");
        return $(element).text();
      }).get().join("\n").trim();
      return {
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
  const genius = new Genius();
  try {
    switch (action) {
      case "search":
        if (!query) {
          return res.status(400).json({
            error: "Query parameter is required for search."
          });
        }
        const songs = await genius.search(query);
        return res.status(200).json({
          result: songs
        });
      case "lyrics":
        if (!url) {
          return res.status(400).json({
            error: "URL parameter is required for lyrics."
          });
        }
        const lyrics = await genius.lyrics(url);
        return res.status(200).json({
          result: lyrics
        });
      default:
        if (query) {
          const searchResults = await genius.search(query);
          if (searchResults.length === 0) {
            return res.status(404).json({
              error: "No songs found."
            });
          }
          const songLyrics = await genius.lyrics(searchResults[0].url);
          return res.status(200).json({
            song: searchResults[0],
            lyrics: songLyrics
          });
        }
        return res.status(400).json({
          error: "Invalid request. Provide an action ('search' or 'lyrics') or a query parameter."
        });
    }
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({
      error: "Internal Server Error."
    });
  }
}