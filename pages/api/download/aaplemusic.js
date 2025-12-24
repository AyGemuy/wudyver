import axios from "axios";
class AapleMusic {
  constructor() {
    this.baseURL = "https://aaplmusicdownloader.com/api";
    this.headers = {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
      Referer: "https://aaplmusicdownloader.com/song.php#"
    };
  }
  async applesearch(trackUrl) {
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/applesearch.php`, {
        params: {
          url: trackUrl
        }
      });
      return data;
    } catch {
      throw new Error("Gagal mencari lagu di Apple Music.");
    }
  }
  async ytsearch(name, artist, album, link) {
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/composer/ytsearch/mytsearch.php`, {
        params: {
          name: name,
          artist: artist,
          album: album,
          link: link
        },
        headers: this.headers
      });
      return data;
    } catch {
      throw new Error("Gagal mencari lagu di YouTube.");
    }
  }
  async ytdl(videoId) {
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/ytdl.php`, {
        params: {
          q: videoId
        },
        headers: this.headers
      });
      return data;
    } catch {
      throw new Error("Gagal mengunduh video.");
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: "Paramenter 'url' diperlukan"
  });
  const appleMusic = new AapleMusic();
  try {
    const appleData = await appleMusic.applesearch(url);
    if (!appleData.name || !appleData.artist || !appleData.albumname) {
      return res.status(400).json({
        error: "Data Apple Music tidak ditemukan."
      });
    }
    const ytData = await appleMusic.ytsearch(appleData.name, appleData.artist, appleData.albumname, appleData.url);
    if (!ytData.videoid) {
      return res.status(400).json({
        error: "Video YouTube tidak ditemukan."
      });
    }
    const videoData = await appleMusic.ytdl(ytData.videoid);
    return res.status(200).json({
      apple: appleData,
      search: ytData,
      download: videoData
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}