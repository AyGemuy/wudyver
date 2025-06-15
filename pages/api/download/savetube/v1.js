import axios from "axios";
import crypto from "crypto";
class SaveTubeAPI {
  constructor() {
    this.baseURL = "https://media.savetube.me/api";
    this.secretKey = "C5D58EF67A7584E4A29F6C35BBC4EB12";
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      Connection: "keep-alive",
      Origin: "https://yt.savetube.me",
      Referer: "https://yt.savetube.me/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async setCdnURL() {
    try {
      const response = await this.getRandomCDN();
      return {
        info: `https://${response.cdn}/v2/info`,
        download: `https://${response.cdn}/download`
      };
    } catch (error) {
      console.error("Error setting CDN URL:", error);
      throw new Error("Failed to set CDN URL");
    }
  }
  decryptData(encryptedData) {
    try {
      const decipher = crypto.createDecipheriv("aes-128-cbc", Buffer.from(this.secretKey, "hex"), Buffer.alloc(16, 0));
      let decrypted = decipher.update(encryptedData, "base64", "utf8") + decipher.final("utf8");
      const jsonData = decrypted.slice(decrypted.indexOf("{"), decrypted.lastIndexOf("}") + 1);
      return JSON.parse(jsonData);
    } catch (error) {
      console.error("Error decrypting data:", error);
      throw new Error("Failed to decrypt data");
    }
  }
  async getRandomCDN() {
    try {
      const response = await axios.get(`${this.baseURL}/random-cdn`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching random CDN:", error);
      throw new Error("Failed to fetch CDN");
    }
  }
  async getInfo(url, type = "video", quality = "360") {
    try {
      const cdnURL = await this.setCdnURL();
      const response = await axios.post(cdnURL.info, {
        url: url
      }, {
        headers: {
          ...this.headers,
          "Content-Type": "application/json"
        }
      });
      if (response.data?.data) {
        const info = this.decryptData(response.data.data);
        const downloadData = await this.getDownload(cdnURL, type, quality, info);
        return {
          ...info,
          ...downloadData
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching video info:", error);
      throw new Error("Failed to fetch video info");
    }
  }
  async getDownload(cdnURL, type, quality, {
    key = "",
    captchaToken = ""
  }) {
    try {
      const response = await axios.post(cdnURL.download, {
        downloadType: type,
        quality: quality,
        key: key,
        captchaToken: captchaToken
      }, {
        headers: {
          ...this.headers,
          "Content-Type": "application/json"
        }
      });
      return response.data?.data || null;
    } catch (error) {
      console.error("Error fetching download:", error);
      throw new Error("Failed to fetch download link");
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      type,
      quality
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new SaveTubeAPI();
    const result = await downloader.getInfo(url, type, quality);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}