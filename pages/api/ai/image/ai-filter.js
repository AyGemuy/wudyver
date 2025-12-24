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
      styleList: " https://www.aiease.ai/api/api/common/",
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
    const encryptionKeyPhrase = ["Q", "@", "D", "2", "4", "=", "o", "u", "e", "V", "%", "]", "O", "B", "S", "8", "i", ",", "%", "e", "K", "=", "5", "I", "|", "7", "W", "U", "$", "P", "e", "E"].map(char => {
      const charCode = char.charCodeAt(0);
      return String.fromCharCode(charCode);
    }).join("");
    const hashHex = CryptoJS.SHA256(encryptionKeyPhrase).toString(CryptoJS.enc.Hex);
    const encryptionKey = CryptoJS.enc.Hex.parse(hashHex);
    return {
      useEncrypt: function(plainText) {
        const encodedText = encodeURIComponent(plainText);
        const iv = CryptoJS.lib.WordArray.random(16);
        const encrypted = CryptoJS.AES.encrypt(encodedText, encryptionKey, {
          iv: iv,
          mode: CryptoJS.mode.CFB,
          padding: CryptoJS.pad.NoPadding
        });
        const combined = iv.concat(encrypted.ciphertext);
        const encryptedStr = CryptoJS.enc.Base64.stringify(combined);
        return encryptedStr;
      },
      useDecrypt: function(base64EncryptedText) {
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
        const decryptedText = decodeURIComponent(decrypted.toString(CryptoJS.enc.Utf8));
        return decryptedText;
      }
    };
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
      const metadata = {
        length: fileBuffer.length,
        filetype: "image/jpeg",
        filename: "image.jpg"
      };
      const metadataJsonString = JSON.stringify(metadata);
      const encryptedMetadata = this.useEncrypt(metadataJsonString);
      const tValue = encryptedMetadata;
      const apiUrl = `${this.api.uploader}?time=${Date.now()}`;
      const payload = {
        t: tValue
      };
      const response = await axios.post(apiUrl, payload, {
        headers: this.headers.json
      });
      const uploadUrl = this.useDecrypt(response.data.result);
      const imageSizeInBytes = fileBuffer.length;
      await axios.put(uploadUrl, fileBuffer, {
        headers: {
          "Content-Length": imageSizeInBytes,
          ...this.headers.image
        }
      });
      return uploadUrl.split("?")[0];
    } catch (error) {
      throw error;
    }
  }
  async img2img({
    tools: type = "filter",
    input = "https://banggaikep.go.id/portal/wp-content/uploads/2024/03/jokowi-1-845x321.jpg",
    style = 4,
    mode = "general"
  } = {}) {
    if (!this.AUTH_TOKEN) await this.getToken();
    try {
      const payload = this.default_payload[type];
      if (!payload) {
        throw new Error(`Invalid type: ${type}\nSupported types: ${Object.keys(this.default_payload).join(", ")}`);
      }
      const imgUrl = await this.uploadImage(input);
      const dataKey = Object.keys(payload).find(key => key.endsWith("_extra_data"));
      if (dataKey) {
        payload[dataKey].img_url = imgUrl;
      }
      if (type === "filter") {
        payload[dataKey].style_id = style;
      } else if (type === "enhance") {
        payload[dataKey].mode = mode;
      }
      const response = await axios.post(this.api.genImg2Img, payload, {
        headers: this.headers.json
      });
      if (response.data && response.data.result && response.data.result.task_id) {
        const taskId = response.data.result.task_id;
        console.log(`Task ID received: ${taskId}`);
        return await this.checkTaskStatus(taskId);
      } else {
        throw new Error(response.data.message || "Task ID not found in response");
      }
    } catch (error) {
      console.error("Image Generation Error:", error.message);
      throw error;
    }
  }
  async txt2img({
    input: prompt = "men",
    style = 1,
    size = "1-1"
  } = {}) {
    if (!this.AUTH_TOKEN) await this.getToken();
    try {
      if (!prompt) throw new Error("Please provide a prompt.");
      const payload = {
        gen_type: "art_v1",
        art_v1_extra_data: {
          prompt: prompt,
          style_id: style,
          size: size
        }
      };
      const response = await axios.post(this.api.gentext2img, payload, {
        headers: this.headers.json
      });
      if (response.data && response.data.result && response.data.result.task_id) {
        const taskId = response.data.result.task_id;
        console.log(`Task ID received: ${taskId}`);
        return await this.checkTaskStatus(taskId);
      } else {
        throw new Error(response.data.message || "Task ID not found in response");
      }
    } catch (error) {
      console.error("Image Generation Error:", error.message);
      throw error;
    }
  }
  async checkTaskStatus(taskId, maxRetry = this.constants.maxRetry) {
    let status = "";
    let attempts = 0;
    while (status !== "success" && attempts < maxRetry) {
      try {
        const response = await axios.get(`${this.api.taskInfo}?task_id=${taskId}`, {
          headers: this.headers.json
        });
        if (response.data.code === 450) {
          throw new Error(response.data.message);
        }
        if (response.data && response.data.result && response.data.result.data) {
          status = response.data.result.data.queue_info.status;
          console.log(`Task ${taskId} status: ${status}`);
          if (status === "success") {
            console.log(`Task ${taskId} succeeded!`);
            return response.data.result.data.results;
          }
        }
      } catch (error) {
        console.error("Task Status Check Error:", error.message);
        if (error.message.includes("Image generation failed")) {
          throw new Error(error.message);
        }
      }
      attempts++;
      if (attempts >= maxRetry) {
        console.error("Task Status Check Error:", `Max retry limit reached (${maxRetry}) for task ${taskId}`);
        throw new Error(`Max retry limit reached (${maxRetry}) for task ${taskId}`);
      }
      await new Promise(resolve => setTimeout(resolve, this.constants.retryDelay));
    }
  }
  async getStyle({
    type = "filter"
  }) {
    if (!this.AUTH_TOKEN) await this.getToken();
    try {
      const end = {
        art: "ai_art_style",
        filter: "ai_filter_style"
      } [type];
      if (!end) {
        throw new Error(`Invalid type: ${type}\nSupported types: ${Object.keys(end).join(", ")}`);
      }
      const response = await axios.get(this.api.styleList + end, {
        headers: this.headers.json
      });
      if (response.data.code === 200) {
        console.log("Style list fetched successfully.");
        return response.data.result;
      } else {
        console.error("Failed to fetch style list:", response.data.message || "Unknown error");
        throw new Error(response.data.message || "Failed to fetch style list");
      }
    } catch (error) {
      console.error("Error fetching style list:", error.message);
      throw error;
    }
  }
  async getToken() {
    try {
      const response = await axios.post(this.api.token, {}, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0"
        }
      });
      if (response.data.code === 200) {
        console.log("Token fetched successfully.");
        const jwt = `JWT ${response.data.result.user.token}`;
        this.AUTH_TOKEN = jwt;
        this.headers.json.Authorization = this.AUTH_TOKEN;
        return;
      } else {
        console.error("Failed to fetch token:", response.data.message || "Unknown error");
        throw new Error(response.data.message || "Failed to fetch token");
      }
    } catch (error) {
      console.error("Error fetching token:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "txt2img | img2img | style"
      }
    });
  }
  const aiease = new Aiease({
    debug: true
  });
  try {
    let result;
    switch (action) {
      case "txt2img":
      case "img2img":
        if (!params.input) {
          return res.status(400).json({
            error: `Missing required field: input (required for ${action})`
          });
        }
        result = await aiease[action](params);
        break;
      case "style":
        if (!params.type) {
          return res.status(400).json({
            error: "Missing required field: type (required for style)"
          });
        }
        result = await aiease.getStyle(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: txt2img | img2img | style`
        });
    }
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}