import axios from "axios";
class Lrclib {
  constructor() {
    this.api = {
      search: "https://lrclib.net/api/search"
    };
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://lrclib.net"
    };
  }
  async searchLyrics(query) {
    if (!query) throw new Error("Query parameter is required.");
    const url = `${this.api.search}?q=${encodeURIComponent(query)}`;
    try {
      const {
        data
      } = await axios.get(url, {
        headers: this.headers
      });
      if (!data.length) throw new Error("No lyrics found.");
      return data.map(item => ({
        id: item.id,
        trackName: item.trackName,
        artistName: item.artistName,
        albumName: item.albumName,
        duration: item.duration,
        instrumental: item.instrumental,
        plainLyrics: item.plainLyrics,
        details: item
      }));
    } catch (error) {
      throw new Error(`Error fetching lyrics: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  const lrclib = new Lrclib();
  try {
    if (!query) return res.status(400).json({
      error: "Query parameter is required."
    });
    const results = await lrclib.searchLyrics(query);
    return res.status(200).json({
      results: results
    });
  } catch (error) {
    console.error("Error handling request:", error.message);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}