import axios from "axios";
class LyricsAPI {
  async fetchLyrics(source, title) {
    const url = source === "musixmatch" ? `https://lyrics.lewdhutao.my.eu.org/musixmatch/lyrics?title=${encodeURIComponent(title)}` : `https://lyrics.lewdhutao.my.eu.org/youtube/lyrics?title=${encodeURIComponent(title)}`;
    try {
      const response = await axios.get(url);
      return response.data || "Lirik tidak ditemukan.";
    } catch (error) {
      console.error(`Error fetching lyrics from ${source}:`, error);
      return "Error fetching lyrics.";
    }
  }
}
export default async function handler(req, res) {
  const {
    query,
    type = 1
  } = req.method === "GET" ? req.query : req.body;
  const lyricsAPI = new LyricsAPI();
  if (!query) {
    return res.status(400).json({
      error: "Query parameter is required."
    });
  }
  try {
    const source = type === "2" ? "youtube" : "musixmatch";
    const lyrics = await lyricsAPI.fetchLyrics(source, query);
    return res.status(200).json({
      result: lyrics
    });
  } catch (error) {
    console.error("Error handling request:", error);
    return res.status(500).json({
      error: "Internal Server Error."
    });
  }
}