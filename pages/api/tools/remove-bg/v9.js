import axios from "axios";
import CryptoJS from "crypto-js";
class RemovePhotos {
  constructor(apiKey = "0zcCs5xWKy6fb4ZVmRdlhao0YKrQERfL", origin = "https://remove.photos/remove-background") {
    this.apiKey = apiKey;
    this.origin = origin;
    this.hostDomain = origin;
  }
  getAppName() {
    return this.hostDomain.replace(/^https?:\/\//, "").split("/")[0];
  }
  formatter() {
    return {
      stringify: e => {
        const t = {
          ct: e.ciphertext.toString(CryptoJS.enc.Base64)
        };
        e.iv && (t.iv = e.iv.toString());
        e.salt && (t.s = e.salt.toString());
        return JSON.stringify(t);
      },
      parse: e => {
        const t = JSON.parse(e);
        const o = CryptoJS.lib.CipherParams.create({
          ciphertext: CryptoJS.enc.Base64.parse(t.ct)
        });
        t.iv && (o.iv = CryptoJS.enc.Hex.parse(t.iv));
        t.s && (o.salt = CryptoJS.enc.Hex.parse(t.s));
        return o;
      }
    };
  }
  encrypt(data) {
    return CryptoJS.AES.encrypt(typeof data === "string" ? data : JSON.stringify(data), this.apiKey, {
      format: this.formatter()
    }).toString();
  }
  decrypt(encryptedData) {
    const jsonStr = typeof encryptedData === "string" ? encryptedData : JSON.stringify(encryptedData);
    return CryptoJS.AES.decrypt(jsonStr, this.apiKey, {
      format: this.formatter()
    }).toString(CryptoJS.enc.Utf8);
  }
  createSignData(data) {
    const encrypted = this.encrypt(data);
    const timestamp = Date.now();
    const appName = this.getAppName();
    const sign = CryptoJS.MD5(encrypted + timestamp + appName).toString();
    return JSON.stringify({
      _sign: sign,
      _key: timestamp,
      _data: encrypted
    });
  }
  async convertToBase64(url) {
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const contentType = res.headers["content-type"] || "image/jpg";
      return {
        base64: Buffer.from(res.data).toString("base64"),
        type: "matting",
        fileName: `input_${Date.now()}.${contentType.split("/")[1] || "jpg"}`
      };
    } catch (err) {
      console.error("❌ convertToBase64 error:", err.message);
      return null;
    }
  }
  getHeaders() {
    return {
      accept: "application/json",
      "content-type": "application/json"
    };
  }
  async matting({
    imageUrl,
    format = "url"
  }) {
    try {
      console.log("⚙️ Starting matting process...");
      const imageData = await this.convertToBase64(imageUrl);
      if (!imageData) throw new Error("Failed to convert image");
      const payload = this.createSignData(imageData);
      const res = await axios.post("https://remove.photos/api/images/matting", payload, {
        headers: this.getHeaders()
      });
      const decrypted = this.decrypt(res.data);
      const {
        fileID
      } = JSON.parse(decrypted);
      console.log("✅ fileID obtained:", fileID);
      const result = await this.pollingTask(fileID);
      console.log("✅ Matting result:", result);
      if (format !== "url") {
        const base64Output = await this.getBase64(result);
        console.log("✅ Base64 result:", base64Output);
        return base64Output;
      }
      return result;
    } catch (err) {
      console.error("❌ matting error:", err.message);
      return null;
    }
  }
  async pollingTask(fileID) {
    const interval = 3e3;
    while (true) {
      const payload = this.createSignData({
        fileID: fileID,
        type: "matting"
      });
      try {
        const res = await axios.post("https://remove.photos/api/images/result", payload, {
          headers: this.getHeaders()
        });
        const raw = JSON.parse(this.decrypt(res.data));
        const results = raw?.results;
        if (results?.recommend?.image) {
          const base = "https://remove.photos";
          return {
            base: base,
            original: results.original?.image ? {
              url: base + results.original.image,
              width: results.original.width,
              height: results.original.height,
              type: results.original.type
            } : null,
            recommend: {
              url: base + results.recommend.image,
              model: results.recommend.model
            }
          };
        }
      } catch (err) {
        console.error("⏳ Error checking recommend result:", err.message);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  async getBase64(image) {
    try {
      const payload = this.createSignData({
        image: image.results.recommend.image
      });
      const res = await axios.post("https://remove.photos/api/images/base64", payload, {
        headers: this.getHeaders()
      });
      return JSON.parse(this.decrypt(res.data));
    } catch (err) {
      console.error("❌ getBase64 error:", err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' is required"
    });
  }
  try {
    const client = new RemovePhotos();
    const result = await client.matting(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}