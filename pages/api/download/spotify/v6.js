import axios from "axios";
class SpotifyDownloader {
  constructor() {
    this.baseUrl = "https://api.spotidownloader.com";
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8,zh-TW;q=0.7,zh;q=0.6,ja;q=0.5",
      Origin: "https://spotifydown.com",
      Referer: "https://spotifydown.com/",
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
    };
  }
  extractTrackId(url) {
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }
  async getMetadata(trackId) {
    try {
      const url = `${this.baseUrl}/metadata/track/${trackId}`;
      const response = await axios.get(url, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching metadata: ${error.response?.status || error.message}`);
    }
  }
  async getDownloadLink(trackId) {
    try {
      const url = `${this.baseUrl}/download/${trackId}`;
      const response = await axios.get(url, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching download link: ${error.response?.status || error.message}`);
    }
  }
  async fetchTrackData(spotifyUrl) {
    try {
      const trackId = this.extractTrackId(spotifyUrl);
      if (!trackId) {
        throw new Error("Invalid Spotify URL");
      }
      const [metadata, downloadData] = await Promise.all([this.getMetadata(trackId), this.getDownloadLink(trackId)]);
      const fileName = `${metadata.artists} - ${metadata.title}.mp3`;
      return {
        metadata: metadata,
        downloadLink: `/download?url=${encodeURIComponent(downloadData.link)}`,
        fileName: fileName
      };
    } catch (error) {
      throw new Error(`Error fetching track data: ${error.message}`);
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
    const trackData = await spotifyDownloader.fetchTrackData(url);
    return res.status(200).json(trackData);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}