import axios from "axios";
import CryptoJS from "crypto-js";
class SavetubeDownloader {
  constructor() {
    this.cryptoKey = "C5D58EF67A7584E4A29F6C35BBC4EB12";
  }
  async getRandomCdn() {
    try {
      const {
        data
      } = await axios.get("https://media.savetube.me/api/random-cdn");
      console.log("[CDN]", data.cdn);
      return data.cdn;
    } catch (error) {
      console.error("Failed to get CDN:", error.message);
      throw new Error("Unable to get CDN endpoint");
    }
  }
  formatInput(input) {
    try {
      const cleanInput = input.replace(/\s/g, "");
      const rawData = Buffer.from(cleanInput, "base64");
      const iv = rawData.slice(0, 16);
      const encrypted = rawData.slice(16);
      return {
        iv: iv,
        encrypted: encrypted
      };
    } catch (error) {
      throw new Error(`Input format error: ${error.message}`);
    }
  }
  decryptData(encryptedBase64) {
    try {
      const {
        iv,
        encrypted
      } = this.formatInput(encryptedBase64);
      const key = CryptoJS.enc.Hex.parse(this.cryptoKey);
      const ivWordArray = CryptoJS.lib.WordArray.create(iv);
      const encryptedWordArray = CryptoJS.lib.WordArray.create(encrypted);
      const decrypted = CryptoJS.AES.decrypt({
        ciphertext: encryptedWordArray
      }, key, {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedText);
    } catch (error) {
      console.error("Decryption failed:", error.message);
      throw error;
    }
  }
  async fetchVideoInfo(url) {
    try {
      const cdn = await this.getRandomCdn();
      const {
        data
      } = await axios.post(`https://${cdn}/v2/info`, {
        url: url
      });
      if (!data.status) {
        console.warn("Fetch video info failed:", data.message);
        return {
          status: false,
          data: null,
          message: data.message || "Failed to fetch video info"
        };
      }
      const decrypted = this.decryptData(data.data);
      console.log("[Video Info Fetched]", decrypted.title);
      return {
        status: true,
        data: decrypted,
        message: ""
      };
    } catch (error) {
      console.error("Error in fetchVideoInfo:", error.message);
      return {
        status: false,
        data: null,
        message: "Fetch failed"
      };
    }
  }
  async fetchDownloadUrl(videoKey, quality, type, directUrl = null, titleSlug = "") {
    try {
      const cdn = await this.getRandomCdn();
      if (directUrl && type !== "audio") {
        const result = {
          status: true,
          data: {
            downloadUrl: `${directUrl}&title=${titleSlug}-ytshorts.savetube.me`
          },
          message: ""
        };
        console.log("[Direct Download URL]", result.data.downloadUrl);
        return result;
      }
      const {
        data
      } = await axios.post(`https://${cdn}/download`, {
        downloadType: type === "audio" || quality === "128" ? "audio" : "video",
        quality: quality,
        key: videoKey
      });
      console.log("[Download Fetched]", data.data?.downloadUrl);
      return data;
    } catch (error) {
      console.error("Error fetching download URL:", error.message);
      return {
        status: false,
        message: "Download failed",
        data: null
      };
    }
  }
  async download({
    url,
    quality = "360",
    type = "video"
  }) {
    try {
      const info = await this.fetchVideoInfo(url);
      if (!info.status) return info;
      const data = info.data;
      let formats = [];
      let directUrl = null;
      if (type === "video") {
        formats = data.video_formats || [];
        directUrl = formats.find(f => String(f.height) === String(quality))?.url;
      } else if (type === "audio") {
        formats = data.audio_formats || [];
        directUrl = formats.find(f => String(f.quality) === String(quality))?.url;
      } else {
        return {
          status: false,
          message: 'Invalid type. Use "video" or "audio".',
          data: null
        };
      }
      if (!directUrl) {
        console.warn("Requested quality not found, returning available formats.");
        return {
          status: false,
          message: `Quality "${quality}" not found. Available ${type} formats listed.`,
          data: {
            title: data.title,
            thumbnail: data.thumbnail,
            duration: data.durationLabel,
            availableFormats: formats
          }
        };
      }
      const result = await this.fetchDownloadUrl(data.key, quality, type, directUrl, data.titleSlug);
      return {
        status: result.status,
        message: result.message,
        data: {
          videoInfo: data,
          downloadUrl: result.data?.downloadUrl,
          ...result.data
        }
      };
    } catch (error) {
      console.error("Error in download:", error.message);
      return {
        status: false,
        data: null,
        message: "Unexpected error occurred"
      };
    }
  }
  async getAvailableFormats(url) {
    try {
      const info = await this.fetchVideoInfo(url);
      if (!info.status) return info;
      const data = info.data;
      return {
        status: true,
        message: "",
        data: {
          title: data.title,
          thumbnail: data.thumbnail,
          duration: data.durationLabel,
          videoFormats: data.video_formats || [],
          audioFormats: data.audio_formats || []
        }
      };
    } catch (error) {
      console.error("Error getting formats:", error.message);
      return {
        status: false,
        data: null,
        message: "Failed to get formats"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const downloader = new SavetubeDownloader();
    const response = await downloader.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}