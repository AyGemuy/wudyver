import axios from "axios";
class SpotifyRapid {
  constructor(apiKey) {
    this.client = axios.create({
      baseURL: "https://spotify-downloader9.p.rapidapi.com",
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        Origin: "https://spotify.downloaderize.com",
        Referer: "https://spotify.downloaderize.com/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "x-rapidapi-host": "spotify-downloader9.p.rapidapi.com",
        "x-rapidapi-key": apiKey
      }
    });
  }
  async downloadTrack(url) {
    try {
      const {
        data
      } = await this.client.get("/downloadSong", {
        params: {
          songId: url
        }
      });
      return data || null;
    } catch {
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing required query parameter: url"
    });
  }
  try {
    const spotify = new SpotifyRapid();
    const result = await spotify.downloadTrack(url);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}