import axios from "axios";
import * as cheerio from "cheerio";
const proxyUrls = "https://api.allorigins.win/raw?url=";
class Songfact {
  async search(query) {
    const baseUrl = "https://www.songfacts.com";
    const url = `${proxyUrls + baseUrl}/search/songs/${encodeURIComponent(query)}`;
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      return $(".container .spacer .row .col-xs-12 ul.browse-list-orange li").map((_, element) => {
        const songTitle = $(element).find("a").text().trim();
        const songLink = $(element).find("a").attr("href");
        const author = songLink?.split("/")[2]?.replace("-", " ") || "unknown";
        const newLink = songLink ? songLink.replace(/\/facts\//, "/lyrics/") : `${baseUrl}/lyrics/adele/hello`;
        return {
          title: songTitle,
          author: author,
          url: `${baseUrl}${newLink}`
        };
      }).get();
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  }
  async lyrics(url) {
    try {
      const response = await axios.get(`${proxyUrls + url}`);
      const $ = cheerio.load(response.data);
      const lyrics = $(".lyrics-results .inner").html()?.replace(/<br>/g, "\n")?.trim() || "Lyrics not found";
      const writer = $(".lyrics-license").text().trim() || "Writer information not available";
      const songTitle = $(".sub-header h3").text().split("by")[0]?.trim() || "Song title not found";
      const artist = $(".sub-header .title-artist").text().trim() || "Artist not found";
      const album = $(".albumheader").first().text().replace("Album: ", "").trim() || "Album not found";
      const chartPosition = $(".albumheader").last().text().replace("Charted: ", "").trim() || "Chart position not available";
      const albumLink = $(".albumheader a").attr("href") ? `https://www.songfacts.com${$(".albumheader a").attr("href")}` : "No album link available";
      const youtubeVideo = $("#YoutubeImage").attr("src") || "No video available";
      return {
        title: songTitle,
        artist: artist,
        album: album,
        chart: chartPosition,
        album: albumLink,
        lyrics: this.cleanText(lyrics),
        writer: this.cleanText(writer),
        thumb: youtubeVideo
      };
    } catch (error) {
      console.error("Error fetching details:", error);
      return {
        lyrics: "Error fetching lyrics",
        writer: "Error fetching writer"
      };
    }
  }
  cleanText(text) {
    return text.replace(/\s+/g, " ").replace(/<[^>]*>?/gm, "").trim();
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const lirik = new Songfact();
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