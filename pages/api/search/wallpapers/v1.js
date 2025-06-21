import axios from "axios";
import crypto from "crypto";
class Minimal {
  constructor() {
    this.baseURL = "https://minimal.4everwallpaper.in/apiV2/api.php";
    this.baseIMG = "https://minimal.4everwallpaper.in/images/";
    this.headers = {
      "User-Agent": "Postify/1.0.0",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip"
    };
    this.packageName = "com.minimal.wallpaper";
  }
  randomKey(length = 32) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").toUpperCase().substring(0, length);
  }
  secureKey() {
    const time = new Date().toISOString().slice(0, 19).replace("T", " ");
    const value = `package=${this.packageName},key=${this.randomKey()},time=${time}`;
    return Buffer.from(value).toString("base64");
  }
  async search({
    query = "",
    limit = 0
  }) {
    try {
      const response = await axios.get(this.baseURL, {
        params: {
          getwallpapersbysearch: "",
          search: query,
          offset: limit
        },
        headers: {
          ...this.headers,
          SECURE_KEY: this.secureKey()
        }
      });
      return response.data.map(item => ({
        ...item,
        images: this.baseIMG + item.wallpaper_image
      }));
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query are required"
    });
  }
  try {
    const api = new Minimal();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}