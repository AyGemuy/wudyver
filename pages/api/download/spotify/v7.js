import axios from "axios";
class SpotifyDownloader {
  constructor() {
    this.headers = {
      accept: "*/*",
      "content-type": "application/json",
      origin: "https://spotify.musicdown.co",
      referer: "https://spotify.musicdown.co/",
      "user-agent": "Postify/1.0.0"
    };
    this.regex = {
      track: /^https:\/\/open\.spotify\.com\/track\//,
      playlist: /^https:\/\/open\.spotify\.com\/playlist\//
    };
  }
  input(url) {
    if (!url) throw new Error("Harap masukkan tautan Spotify yang valid.");
    if (this.regex.track.test(url)) {
      return "track";
    } else if (this.regex.playlist.test(url)) {
      return "playlist";
    } else {
      throw new Error("Tautan yang dimasukkan bukan tautan Spotify yang valid.");
    }
  }
  async metadata(url) {
    try {
      const response = await axios.post("https://spotify.musicdown.co/api/get-metadata", {
        url: url
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan saat mengambil metadata:", error);
      throw new Error("Gagal mengambil metadata. Silakan coba lagi nanti.");
    }
  }
  async download(url) {
    try {
      const response = await axios.post("https://spotify.musicdown.co/api/download-track", {
        url: url
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan saat mengunduh lagu:", error);
      throw new Error("Gagal mengunduh lagu. Silakan coba lagi nanti.");
    }
  }
  async process(url, options = {}) {
    try {
      const type = this.input(url);
      const metadata = await this.metadata(url);
      if (type === "track") {
        const info = await this.download(url);
        return {
          type: "track",
          metadata: metadata,
          downloadUrl: info.file_url
        };
      } else if (type === "playlist") {
        const playlistDown = {};
        let tracksToDownload = metadata.apiResponse.data;
        if (options.titles && options.titles.length > 0) {
          tracksToDownload = tracksToDownload.filter(track => options.titles.some(title => track.name.toLowerCase().includes(title.toLowerCase())));
        } else if (options.limit) {
          tracksToDownload = tracksToDownload.slice(0, options.limit);
        } else {
          tracksToDownload = tracksToDownload.slice(0, 5);
        }
        for (const track of tracksToDownload) {
          try {
            const info = await this.download(track.url);
            playlistDown[track.name] = info.file_url;
          } catch (error) {
            console.error(`Gagal mendapatkan tautan unduh untuk "${track.name}":`, error);
            playlistDown[track.name] = null;
          }
        }
        return {
          type: "playlist",
          metadata: {
            ...metadata,
            downloaded_tracks: tracksToDownload.length,
            total_tracks: metadata.apiResponse.data.length
          },
          downloads: playlistDown
        };
      }
    } catch (error) {
      console.error("Terjadi kesalahan dalam memproses tautan:", error);
      throw new Error("Terjadi kesalahan saat memproses permintaan. Silakan coba lagi.");
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
    const spotifyDownloader = new SpotifyDownloader();
    const trackData = await spotifyDownloader.process(url);
    return res.status(200).json(trackData);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}