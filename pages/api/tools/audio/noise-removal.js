import axios from "axios";
import CryptoJS from "crypto-js";
import {
  FormData
} from "formdata-node";
class NoiseRemoval {
  constructor() {
    this.api = {
      base: "https://noiseremoval.net/wp-content/plugins/audioenhancer",
      enhance: "/requests/noiseremoval/noiseremovallimited.php",
      timestamp: "/unix.php"
    };
    this.headers = {
      authority: "noiseremoval.net",
      "user-agent": "Postify/1.0.0",
      origin: "https://noiseremoval.net",
      referer: "https://noiseremoval.net/",
      "x-requested-with": "XMLHttpRequest"
    };
    this.constants = {
      timeout: 6e4,
      mimek: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a", "audio/x-m4a", "audio/aac", "audio/mp4", "audio/opus", "audio/x-aiff", "audio/aiff", "audio/x-aifc", "video/mp4", "video/3gpp", "video/quicktime", "video/x-msvideo", "audio/x-m4b", "audio/x-m4p", "audio/x-m4r", "video/x-m4v"],
      extensions: [".m4a", ".mp4", ".3gp", ".m4b", ".aac", ".m4p", ".m4r", ".m4v", ".aif", ".aiff", ".aifc", ".avi", ".mov", ".qt", ".mp3", ".opus", ".ogg", ".wav"],
      modes: ["pulse", "orbit"]
    };
  }
  generateFingerprint() {
    const randomBytes = CryptoJS.lib.WordArray.random(16);
    return CryptoJS.enc.Hex.stringify(randomBytes);
  }
  encryptData(data) {
    const salt = CryptoJS.lib.WordArray.random(256);
    const iv = CryptoJS.lib.WordArray.random(16);
    const key = CryptoJS.PBKDF2("cryptoJS", salt, {
      hasher: CryptoJS.algo.SHA512,
      keySize: 8,
      iterations: 999
    });
    const encrypted = CryptoJS.AES.encrypt(data.toString(), key, {
      iv: iv
    });
    return {
      amtext: CryptoJS.enc.Base64.stringify(encrypted.ciphertext),
      iavmol: CryptoJS.enc.Hex.stringify(iv),
      slam_ltol: CryptoJS.enc.Hex.stringify(salt)
    };
  }
  async getUnixTimestamp() {
    try {
      const response = await axios.get(`${this.api.base}${this.api.timestamp}`, {
        headers: this.headers
      });
      return {
        status: true,
        code: 200,
        result: response.data
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        result: {
          error: "Gagal mengambil timestamp, coba lagi nanti! 😑"
        }
      };
    }
  }
  async getFileInfo(url) {
    try {
      const response = await axios.head(url);
      const disposition = response.headers["content-disposition"];
      let filename = "audio.mp3";
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) filename = match[1].replace(/['"]/g, "");
      }
      const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
      const isExt = this.constants.extensions.includes(ext);
      const contentType = response.headers["content-type"];
      const isMime = this.constants.mimek.includes(contentType);
      if (!isExt && !isMime) {
        return {
          status: false,
          code: 400,
          result: {
            error: `Format "${filename}" tidak didukung. Gunakan format: ${this.constants.extensions.join(", ")} 👍🏻`
          }
        };
      }
      return {
        status: true,
        code: 200,
        result: {
          filename: filename,
          mimetype: contentType
        }
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        result: {
          error: "Gagal mendapatkan info file, coba lagi nanti! 🗿",
          details: error.message
        }
      };
    }
  }
  async downloadFile(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 3e4
      });
      return {
        status: true,
        code: 200,
        result: Buffer.from(response.data, "binary")
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        result: {
          error: error.message.includes("timeout") ? "Download timeout, coba lagi nanti! 🤣" : "Gagal download file! 🗿"
        }
      };
    }
  }
  async removeNoise(url = "", mode = "pulse") {
    if (!url) {
      return {
        status: false,
        code: 400,
        result: {
          error: "Masukkan link file untuk menghapus noise! 🗿"
        }
      };
    }
    if (!this.constants.modes.includes(mode)) {
      return {
        status: false,
        code: 400,
        result: {
          error: `Mode "${mode}" tidak tersedia. Pilih: ${this.constants.modes.join(" atau ")} 👍🏻`
        }
      };
    }
    try {
      new URL(url);
    } catch {
      return {
        status: false,
        code: 400,
        result: {
          error: "URL tidak valid, periksa kembali! 👎🏻"
        }
      };
    }
    const fileInfo = await this.getFileInfo(url);
    if (!fileInfo.status) return fileInfo;
    const downloadedFile = await this.downloadFile(url);
    if (!downloadedFile.status) return downloadedFile;
    try {
      const timestamp = await this.getUnixTimestamp();
      if (!timestamp.status) return timestamp;
      const fingerprint = this.generateFingerprint();
      const encryptedTimestamp = this.encryptData(timestamp.result);
      const formData = new FormData();
      formData.append("media", downloadedFile.result, {
        filename: fileInfo.result.filename,
        contentType: fileInfo.result.mimetype
      });
      formData.append("fingerprint", fingerprint);
      formData.append("mode", mode);
      formData.append("amtext", encryptedTimestamp.amtext);
      formData.append("iavmol", encryptedTimestamp.iavmol);
      formData.append("slam_ltol", encryptedTimestamp.slam_ltol);
      const response = await axios.post(`${this.api.base}${this.api.enhance}`, formData, {
        headers: {
          ...this.headers,
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: this.constants.timeout
      });
      if (!response.data?.media) {
        return {
          status: false,
          code: 500,
          result: {
            error: "Gagal memproses audio, coba lagi nanti! 😅"
          }
        };
      }
      return {
        status: true,
        code: 200,
        result: {
          media: response.data.media
        }
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        result: {
          error: "Terjadi kesalahan saat memproses audio, coba lagi nanti! 😅",
          details: error.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    mode
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Paramenter 'url' is required"
    });
  }
  try {
    const remover = new NoiseRemoval();
    const result = await remover.removeNoise(url, mode);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}