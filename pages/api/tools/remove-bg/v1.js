import axios from "axios";
import {
  fileTypeFromBuffer
} from "file-type";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  createHash
} from "crypto";
const hashCode = `${createHash("sha256").update(Date.now().toString()).digest("hex")}`;
class RemoveClient {
  constructor(defaultProvider = 0) {
    this.defaultProvider = defaultProvider;
  }
  async getBuffer(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return response.data;
    } catch {
      return null;
    }
  }
  async runProvider(buffer, provider) {
    const providers = [this.RemoveBg, this.BarbieSelfie, this.Photiu, this.EasyEdit, this.RestorePhoto, this.Pixian];
    const selectedProvider = providers[provider || this.defaultProvider];
    return selectedProvider ? selectedProvider.call(this, buffer) : {
      status: false,
      message: "Provider not found"
    };
  }
  async EasyEdit(buffer) {
    try {
      const {
        ext,
        mime
      } = await fileTypeFromBuffer(buffer) || {};
      if (!ext || !mime) throw new Error("File type not identified");
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mime
      }), `rembg.${ext || "jpg"}`);
      formData.append("prompt", "Remove the background");
      const response = await axios.post("https://easyedit.xyz:3000/rembg?uid=null", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      return {
        status: true,
        data: response.data,
        type: response.headers["content-type"]
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        type: "application/json"
      };
    }
  }
  async RestorePhoto(buffer) {
    try {
      if (!buffer) throw new Error("Buffer is undefined");
      const image = buffer.toString("base64");
      const response = await axios.post("https://us-central1-ai-apps-prod.cloudfunctions.net/restorePhoto", {
        image: `data:image/png;base64,${image}`,
        model: "fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003"
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      const cleanedData = response.data.replace(/"/g, "");
      return cleanedData ? {
        status: true,
        image: cleanedData,
        type: "application/json"
      } : {
        status: false,
        message: "Failed to remove background",
        type: "application/json"
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        type: "application/json"
      };
    }
  }
  async Pixian(input) {
    try {
      const media = Buffer.isBuffer(input) ? input : (await axios.get(input, {
        responseType: "arraybuffer"
      })).data;
      const {
        mime
      } = await fileTypeFromBuffer(media) || {
        mime: "image/jpg"
      };
      const formData = new FormData();
      formData.append("image", new Blob([media], {
        type: mime
      }), `${hashCode}.jpg`);
      const response = await axios.post("https://api.pixian.ai/api/v2/remove-background", formData, {
        auth: {
          username: "px3j2tc79h56pfg",
          password: "t01ahvv1cl98liqfa5ac57csf6seho8b47spe4v7kt57hmhr6527"
        },
        responseType: "arraybuffer"
      });
      return {
        status: true,
        data: response.data,
        type: response.headers["content-type"]
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        type: "application/json"
      };
    }
  }
  async BarbieSelfie(input) {
    try {
      const data = Buffer.isBuffer(input) ? input : (await axios.get(input, {
        responseType: "arraybuffer"
      })).data;
      const {
        ext,
        mime
      } = await fileTypeFromBuffer(data) || {
        ext: "jpg",
        mime: "image/jpg"
      };
      const formData = new FormData();
      formData.append("myfile", new Blob([data], {
        type: mime
      }), hashCode);
      const headers = {
        Accept: "application/json, text/plain, */*",
        "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
        Origin: "https://www.barbieselfie.ai",
        Referer: "https://www.barbieselfie.ai/intl/step/loading/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
      };
      const response = await axios.post("https://www.barbieselfie.ai/api/upload.php", formData, {
        headers: headers,
        responseType: "arraybuffer"
      });
      return {
        status: true,
        data: Buffer.from(response.data),
        type: response.headers["content-type"]
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        type: "application/json"
      };
    }
  }
  async Photiu(buffer) {
    try {
      const {
        mime
      } = await fileTypeFromBuffer(buffer) || {
        mime: "image/jpeg"
      };
      const formData = new FormData();
      formData.append("upfile", new Blob([buffer], {
        type: mime
      }));
      const response = await axios.post("https://www.photiu.ai/api/rmb", formData, {
        responseType: "arraybuffer"
      });
      return {
        status: true,
        data: response.data,
        type: response.headers["content-type"]
      };
    } catch (error) {
      throw new Error("Photiu background removal failed: " + error.message);
    }
  }
  async RemoveBg(buffer) {
    try {
      const keyList = ["jm484k8iyF37DT5E51sWAr3v", "wYj4CmzTa1CJX2YVsCZdnsZq", "hz99DPWitBbRAgnjTrtG3rEF", "aGSQ7rF4TnnUeytKEbX72fSN"];
      const nobgKey = keyList[Math.floor(Math.random() * keyList.length)];
      const {
        mime
      } = await fileTypeFromBuffer(buffer) || {
        mime: "image/png"
      };
      const formData = new FormData();
      formData.append("image_file", new Blob([buffer], {
        type: mime
      }));
      const response = await axios.post("https://api.remove.bg/v1.0/removebg", formData, {
        headers: {
          "X-Api-Key": nobgKey
        },
        responseType: "arraybuffer"
      });
      return {
        status: true,
        data: response.data,
        type: response.headers["content-type"]
      };
    } catch (error) {
      throw new Error("Remove.bg background removal failed: " + error.message);
    }
  }
  async processImage(url, provider) {
    const imageData = await this.getBuffer(url);
    if (!imageData) return {
      status: false,
      message: "Failed to fetch image data",
      type: "application/json"
    };
    return await this.runProvider(imageData, provider);
  }
}
export default async function handler(req, res) {
  const {
    url,
    provider = 0
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    status: false,
    message: "URL is required"
  });
  const processor = new RemoveClient(parseInt(provider, 10));
  try {
    const result = await processor.processImage(url, parseInt(provider, 10));
    if (result.status) {
      res.setHeader("Content-Type", result.type.includes("image") ? "image/png" : "application/json");
      return res.status(200).send(result.data);
    } else {
      res.status(500).json({
        status: false,
        message: result.message
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
}