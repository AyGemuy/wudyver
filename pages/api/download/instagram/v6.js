import axios from "axios";
const API_KEY = "0647bc5201msh84a9358b48d00eep163485jsne7ecf062e49f";
const RAPIDAPI_HOST = "instagram-media-downloader.p.rapidapi.com";
class InstagramDownloader {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${RAPIDAPI_HOST}`,
      headers: {
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST
      }
    });
  }
  async fetchMedia(type, urlInstagram) {
    if (!type || !urlInstagram) {
      throw new Error("Both type and Instagram URL are required");
    }
    try {
      const {
        data
      } = await this.client.get(`/rapid/${type}.php`, {
        params: {
          url: urlInstagram
        }
      });
      return data;
    } catch (error) {
      throw new Error(`API error: ${error.response?.statusText || error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    type,
    url: urlInstagram
  } = req.method === "GET" ? req.query : req.body;
  if (!urlInstagram) {
    return res.status(400).json({
      error: "Missing required query parameter: url"
    });
  }
  const downloader = new InstagramDownloader();
  try {
    const data = await downloader.fetchMedia(type, urlInstagram);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}