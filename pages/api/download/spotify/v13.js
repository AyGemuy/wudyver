import axios from "axios";
class SpotifyDownloader {
  constructor() {
    this.host = "https://api.fabdl.com";
    this.media = "spotify";
  }
  async download(url) {
    if (!url.includes("spotify.com")) {
      return {
        error: "URL harus dari Spotify"
      };
    }
    try {
      const getUrl = `${this.host}/${this.media}/get?url=${encodeURIComponent(url)}`;
      const response = await axios.get(getUrl);
      if (!response.data.result) {
        return {
          error: "Gagal mendapatkan informasi lagu"
        };
      }
      const result = response.data.result;
      if (result.type === "track") {
        result.tracks = [result];
      }
      const track = result.tracks[0];
      if (!track || !track.id || !result.gid) {
        return {
          error: "ID lagu tidak ditemukan"
        };
      }
      const convertUrl = `${this.host}/${this.media}/mp3-convert-task/${result.gid}/${track.id}`;
      const convertResponse = await axios.get(convertUrl);
      if (!convertResponse.data.result) {
        return {
          error: "Gagal memulai konversi"
        };
      }
      const tid = convertResponse.data.result.tid;
      const progressUrl = `${this.host}/${this.media}/mp3-convert-progress/${tid}`;
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 1e3));
        const progressResponse = await axios.get(progressUrl);
        if (!progressResponse.data.result) {
          return {
            error: "Gagal mengambil progres konversi"
          };
        }
        const status = progressResponse.data.result.status;
        if (status === 3) {
          return {
            name: track.name,
            artists: track.artists,
            image: track.image || result.image,
            duration_ms: track.duration_ms,
            download_url: `${this.host}${progressResponse.data.result.download_url}`
          };
        } else if (status < 0) {
          return {
            error: "Konversi gagal"
          };
        }
      }
    } catch (error) {
      console.error(error);
      return {
        error: "Terjadi kesalahan pada request"
      };
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
    const spotify = new SpotifyDownloader();
    const result = await spotify.download(url);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}