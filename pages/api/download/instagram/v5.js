import axios from "axios";
import crypto from "crypto";
import fakeUserAgent from "fake-useragent";
class InstaVideoSave {
  constructor() {
    this.client = axios.create({
      headers: {
        Accept: "*/*",
        Origin: "https://fastvideosave.net",
        Referer: "https://fastvideosave.net/",
        "User-Agent": fakeUserAgent()
      }
    });
  }
  encodeUrl(text) {
    const key = "qwertyuioplkjhgf";
    const cipher = crypto.createCipheriv("aes-128-ecb", key, null);
    return cipher.update(text, "utf8", "hex") + cipher.final("hex");
  }
  async fetchVideo(url) {
    try {
      const encryptedUrl = this.encodeUrl(url);
      const {
        data
      } = await this.client.get("https://api.videodropper.app/allinone", {
        headers: {
          Url: encryptedUrl
        }
      });
      return data;
    } catch (error) {
      throw new Error("InstaVideoSave API error: " + error.message);
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
    const instaVideo = new InstaVideoSave();
    const result = await instaVideo.fetchVideo(url);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}