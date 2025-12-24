import axios from "axios";
class LyricsAPI {
  constructor() {
    this.baseURL = "https://www.lyricsposter.com/api/lyrics";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://www.lyricsposter.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.lyricsposter.com/da/lyrics-search",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async search({
    query,
    limit = 3,
    ...rest
  }) {
    try {
      const response = await axios.post(`${this.baseURL}/search-songs`, {
        songName: query
      }, {
        headers: this.headers
      });
      if (response.data.code !== 0 || !response.data.data) {
        throw new Error("Response format tidak valid");
      }
      const songs = response.data.data.filter(song => song.titulo && song.subtitulo).map(song => ({
        title: song.titulo,
        artist: song.subtitulo,
        image: song.imagen,
        thumbnail: song.thumbnail,
        uri: song.uri
      })).slice(0, limit);
      const songsWithLyrics = [];
      for (const song of songs.slice(0, limit)) {
        try {
          const lyrics = await this.getLyricsDetails({
            track: song.title,
            artist: song.artist
          });
          songsWithLyrics.push({
            ...song,
            lyrics: lyrics
          });
        } catch (error) {
          console.error(`Gagal mengambil lirik untuk ${song.title}:`, error.message);
          songsWithLyrics.push({
            ...song,
            lyrics: null,
            error: error.message
          });
        }
      }
      return songsWithLyrics;
    } catch (error) {
      console.error("Error dalam pencarian lagu:", error.message);
      throw error;
    }
  }
  async getLyricsDetails({
    track,
    artist,
    ...rest
  }) {
    try {
      const response = await axios.post(`${this.baseURL}/search-lyrics`, {
        track: track,
        artist: artist
      }, {
        headers: this.headers
      });
      if (response.data.code !== 0 || !response.data.data) {
        throw new Error("Response format tidak valid untuk detail lirik");
      }
      return response.data.data;
    } catch (error) {
      console.error("Error dalam mengambil detail lirik:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "query are required"
    });
  }
  try {
    const lyricsAPI = new LyricsAPI();
    const response = await lyricsAPI.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}