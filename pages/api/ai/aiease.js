import CryptoJS from "crypto-js";
import axios from "axios";
class Aiease {
  constructor({
    debug = false
  } = {}) {
    this.DEBUG = debug;
    this.AUTH_TOKEN = null;
    this.api = {
      uploader: "https://www.aiease.ai/api/api/id_photo/s",
      genImg2Img: "https://www.aiease.ai/api/api/gen/img2img",
      gentext2img: "https://www.aiease.ai/api/api/gen/text2img",
      taskInfo: "https://www.aiease.ai/api/api/id_photo/task-info",
      styleList: "https://www.aiease.ai/api/api/common/",
      token: "https://www.aiease.ai/api/api/user/visit"
    };
    this.headers = {
      json: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
        Authorization: null,
        Accept: "application/json"
      },
      image: {
        "Content-Type": "image/jpeg",
        Host: "pub-static.aiease.ai",
        Origin: "https://www.aiease.ai",
        Referer: "https://www.aiease.ai/",
        "User-Agent": "Mozilla/5.0",
        Accept: "*/*"
      }
    };
    this.default_payload = {
      enhance: {
        gen_type: "enhance",
        enhance_extra_data: {
          img_url: null,
          mode: null,
          size: "4",
          restore: 1
        }
      },
      filter: {
        gen_type: "ai_filter",
        ai_filter_extra_data: {
          img_url: null,
          style_id: null
        }
      },
      watermark: {
        gen_type: "text_remove",
        text_remove_extra_data: {
          img_url: null,
          mask_url: ""
        }
      },
      rembg: {
        gen_type: "rembg",
        rembg_extra_data: {
          img_url: null
        }
      },
      retouch: {
        gen_type: "ai_skin_repair",
        ai_skin_repair_extra_data: {
          img_url: null
        }
      }
    };
    this.constants = {
      maxRetry: 40,
      retryDelay: 3e3
    };
    const {
      useEncrypt,
      useDecrypt
    } = this._setupEncryption();
    this.useEncrypt = useEncrypt;
    this.useDecrypt = useDecrypt;
  }
  _setupEncryption() {
    const encryptionKeyPhrase = ["Q", "@", "D", "2", "4", "=", "o", "u", "e", "V", "%", "]", "O", "B", "S", "8", "i", ",", "%", "e", "K", "=", "5", "I", "|", "7", "W", "U", "$", "P", "e", "E"].map(char => String.fromCharCode(char.charCodeAt(0))).join("");
    const hashHex = CryptoJS.SHA256(encryptionKeyPhrase).toString(CryptoJS.enc.Hex);
    const encryptionKey = CryptoJS.enc.Hex.parse(hashHex);
    return {
      useEncrypt: plainText => {
        const encodedText = encodeURIComponent(plainText);
        const iv = CryptoJS.lib.WordArray.random(16);
        const encrypted = CryptoJS.AES.encrypt(encodedText, encryptionKey, {
          iv: iv,
          mode: CryptoJS.mode.CFB,
          padding: CryptoJS.pad.NoPadding
        });
        return CryptoJS.enc.Base64.stringify(iv.concat(encrypted.ciphertext));
      },
      useDecrypt: base64EncryptedText => {
        const encryptedBytes = CryptoJS.enc.Base64.parse(base64EncryptedText);
        const iv = CryptoJS.lib.WordArray.create(encryptedBytes.words.slice(0, 4), 16);
        const ciphertext = CryptoJS.lib.WordArray.create(encryptedBytes.words.slice(4), encryptedBytes.sigBytes - 16);
        const decrypted = CryptoJS.AES.decrypt({
          ciphertext: ciphertext
        }, encryptionKey, {
          iv: iv,
          mode: CryptoJS.mode.CFB,
          padding: CryptoJS.pad.NoPadding
        });
        return decodeURIComponent(decrypted.toString(CryptoJS.enc.Utf8));
      }
    };
  }
  async getToken() {
    try {
      const response = await axios.post(this.api.token, {}, {
        headers: this.headers.json
      });
      if (response.data.code === 200) {
        this.AUTH_TOKEN = `JWT ${response.data.result.user.token}`;
        this.headers.json.Authorization = this.AUTH_TOKEN;
      } else {
        throw new Error(response.data.message || "Gagal mendapatkan token");
      }
    } catch (error) {
      throw new Error(`Error mendapatkan token: ${error.message}`);
    }
  }
  async uploadImage(input) {
    if (!this.AUTH_TOKEN) await this.getToken();
    try {
      let fileBuffer;
      if (Buffer.isBuffer(input)) {
        fileBuffer = input;
      } else if (/^data:.*?\/.*?;base64,/i.test(input)) {
        fileBuffer = Buffer.from(input.split(",")[1], "base64");
      } else if (/^https?:\/\//.test(input)) {
        const response = await axios.get(input, {
          responseType: "arraybuffer"
        });
        fileBuffer = Buffer.from(response.data);
      } else {
        throw new Error("Format gambar tidak valid atau file tidak ditemukan.");
      }
      const encryptedMetadata = this.useEncrypt(JSON.stringify({
        length: fileBuffer.length,
        filetype: "image/jpeg",
        filename: "image.jpg"
      }));
      const response = await axios.post(`${this.api.uploader}?time=${Date.now()}`, {
        t: encryptedMetadata
      }, {
        headers: this.headers.json
      });
      const uploadUrl = this.useDecrypt(response.data.result);
      await axios.put(uploadUrl, fileBuffer, {
        headers: {
          "Content-Length": fileBuffer.length,
          ...this.headers.image
        }
      });
      return uploadUrl.split("?")[0];
    } catch (error) {
      throw new Error(`Upload gambar gagal: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    if (!action) {
      return res.status(400).json({
        error: "Action diperlukan"
      });
    }
    const aiease = new Aiease({
      debug: true
    });
    let result;
    switch (action) {
      case "txt2img":
        result = await aiease.text2img(params);
        break;
      case "img2img":
        result = await aiease.img2img(params);
        break;
      case "style":
        result = await aiease.getStyle(params.type);
        break;
      default:
        return res.status(400).json({
          error: "Aksi tidak valid",
          valid_actions: ["txt2img", "img2img", "style"]
        });
    }
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}