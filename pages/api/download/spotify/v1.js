import axios from "axios";
class SpotifyDownloader {
  constructor() {
    this.baseUrl = "https://www.bhandarimilan.info.np";
    this.headers = {
      authority: "www.bhandarimilan.info.np",
      accept: "*/*",
      "user-agent": "Postify/1.0.0"
    };
  }
  validateLink(link) {
    const spotlink = /^https:\/\/open\.spotify\.com\/.+$/;
    if (!spotlink.test(link)) {
      throw new Error("Link Spotify yang diinputkan tidak valid.");
    }
  }
  async download(link) {
    try {
      this.validateLink(link);
      const url = `${this.baseUrl}/spotify?url=${encodeURIComponent(link)}`;
      const {
        data
      } = await axios.get(url, {
        headers: this.headers
      });
      if (!data.success) {
        throw new Error(`Terjadi kesalahan saat mengekstrak link ${link}`);
      }
      const {
        id,
        artists,
        title,
        album,
        cover,
        isrc,
        releaseDate
      } = data.metadata;
      return {
        success: true,
        metadata: {
          id: id,
          artists: artists,
          title: title,
          album: album,
          cover: cover,
          isrc: isrc,
          releaseDate: releaseDate
        },
        link: data.link
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || `Tidak dapat mengekstrak link Spotify ${link}`
      };
    }
  }
  async searchAndDownload(query) {
    try {
      const url = `${this.baseUrl}/spotisearch?query=${encodeURIComponent(query)}`;
      const {
        data
      } = await axios.get(url, {
        headers: this.headers
      });
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error(`Pencarian ${query} tidak ditemukan.`);
      }
      const track = data[0];
      const downloadInfo = await this.download(track.link);
      return {
        success: true,
        name: track.name,
        artist: track.artist,
        release_date: track.release_date,
        duration: track.duration,
        link: track.link,
        image_url: track.image_url,
        download: downloadInfo.link
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || `Tidak dapat menemukan pencarian ${query}`
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      type
    } = req.method === "GET" ? req.query : req.body;
    if (!url || !type) {
      return res.status(400).json({
        message: "No url, type provided"
      });
    }
    const spotifyDownloader = new SpotifyDownloader();
    const result = type === "dl" ? await spotifyDownloader.download(url) : await spotifyDownloader.searchAndDownload(url);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}