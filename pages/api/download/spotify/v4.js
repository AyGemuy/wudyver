import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class Spotmate {
  constructor() {
    this.baseURL = "https://spotmate.online";
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: this.baseURL,
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
        Referer: "https://spotmate.online/"
      }
    }));
  }
  async getCsrfToken() {
    try {
      const response = await this.client.get("/");
      const $ = cheerio.load(response.data);
      const csrfToken = $('meta[name="csrf-token"]').attr("content");
      return csrfToken;
    } catch (error) {
      console.error("Error fetching CSRF token:", error);
      return null;
    }
  }
  async getTrackData(spotifyUrl) {
    const csrfToken = await this.getCsrfToken();
    if (!csrfToken) {
      console.error("CSRF token tidak ditemukan.");
      return null;
    }
    try {
      const response = await this.client.post("/getTrackData", {
        spotify_url: spotifyUrl
      }, {
        headers: {
          "X-CSRF-TOKEN": csrfToken
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching track data:", error);
      return null;
    }
  }
  async convertTrack(url) {
    const csrfToken = await this.getCsrfToken();
    if (!csrfToken) {
      console.error("CSRF token tidak ditemukan.");
      return null;
    }
    try {
      const response = await this.client.post("/convert", {
        urls: url
      }, {
        headers: {
          "X-CSRF-TOKEN": csrfToken
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error converting track:", error);
      return null;
    }
  }
  async getCombinedData(spotifyUrl) {
    const trackData = await this.getTrackData(spotifyUrl);
    const convertedTrack = await this.convertTrack(spotifyUrl);
    if (trackData && convertedTrack) {
      return {
        ...trackData,
        ...convertedTrack
      };
    } else {
      console.error("Gagal menggabungkan data.");
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
    const spotmate = new Spotmate();
    const combinedData = await spotmate.getCombinedData(url);
    return res.status(200).json({
      result: combinedData
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}