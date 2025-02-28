import axios from "axios";
class SpotifyAPI {
  constructor() {
    this.baseURL = "https://spotymp3.app/api";
    this.headers = {
      "Content-Type": "application/json",
      "User -Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      Referer: "https://spotymp3.app/"
    };
  }
  async getMetadata(url) {
    try {
      const response = await axios.post(`${this.baseURL}/get-metadata`, {
        url: url
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching metadata:", error);
      throw error;
    }
  }
  async downloadTrack(url) {
    try {
      const response = await axios.post(`${this.baseURL}/download-track`, {
        url: url
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error downloading track:", error);
      throw error;
    }
  }
  async download(url) {
    try {
      const metadataResponse = await this.getMetadata(url);
      const downloadResponse = await this.downloadTrack(url);
      return {
        info: metadataResponse.apiResponse.data,
        ...downloadResponse
      };
    } catch (error) {
      console.error("Error during download process:", error);
      throw error;
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
    const spotify = new SpotifyAPI();
    const result = await spotify.download(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Handler Error:", error.message);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}