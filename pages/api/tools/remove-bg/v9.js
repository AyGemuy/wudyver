import axios from "axios";
import CryptoJS from "crypto-js";
import SpoofHead from "@/lib/spoof-head";
class RemovePhotos {
  constructor(apiKey = "0zcCs5xWKy6fb4ZVnRdlhao0YKrQERfL", origin = "https://remove.photos/remove-background") {
    this.apiKey = apiKey;
    this.origin = origin;
    this.hostDomain = origin;
    const originMatch = origin.match(/^https?:\/\/[^/]+/);
    if (!originMatch) {
      throw new Error("Invalid origin URL provided.");
    }
    this.baseUrl = originMatch[0];
    console.log(`RemovePhotos initialized with apiKey: ${apiKey.substring(0, 5)}... and baseUrl: ${this.baseUrl}`);
  }
  randomID(length = 16) {
    const randomWords = CryptoJS.lib.WordArray.random(Math.ceil(length / 2));
    return randomWords.toString(CryptoJS.enc.Hex).slice(0, length);
  }
  buildHeaders(extra = {}) {
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-request-id": this.randomID(8),
      ...SpoofHead(),
      ...extra
    };
    return headers;
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
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(jsonStr, this.apiKey, {
        format: this.formatter()
      });
      return decryptedBytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error("❌ Decryption error:", error.message);
      return "";
    }
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
      const contentType = res.headers["content-type"] || "image/jpeg";
      const extension = contentType.split("/")[1] || "jpg";
      const uint8Array = new Uint8Array(res.data);
      const wordArray = CryptoJS.lib.WordArray.create(uint8Array);
      const base64 = CryptoJS.enc.Base64.stringify(wordArray);
      return {
        base64: base64,
        type: "matting",
        fileName: `input_${Date.now()}.${extension}`
      };
    } catch (err) {
      console.error("❌ convertToBase64 error:", err.message, "URL:", url);
      return null;
    }
  }
  async matting({
    imageUrl,
    format = "url"
  }) {
    try {
      console.log(`⚙️ Starting matting process for: ${imageUrl}`);
      const imageData = await this.convertToBase64(imageUrl);
      if (!imageData) {
        throw new Error("Failed to convert image to base64.");
      }
      const payload = this.createSignData(imageData);
      const apiHeaders = this.buildHeaders({
        "content-type": "application/json",
        accept: "application/json, text/plain, */*"
      });
      const res = await axios.post(`${this.baseUrl}/api/images/matting`, payload, {
        headers: apiHeaders
      });
      const decryptedResponse = this.decrypt(res.data);
      if (!decryptedResponse) throw new Error("Failed to decrypt matting response or response was empty.");
      const {
        fileID
      } = JSON.parse(decryptedResponse);
      if (!fileID) throw new Error("fileID not found in matting response.");
      console.log("✅ fileID obtained:", fileID);
      const result = await this.pollingTask(fileID);
      if (!result) throw new Error("Polling task did not return a result.");
      console.log("✅ Matting polling result obtained.");
      if (format !== "url") {
        console.log("⚙️ Converting result to base64 format...");
        const base64Output = await this.getBase64(result);
        if (!base64Output) throw new Error("Failed to get base64 output for the result.");
        console.log("✅ Base64 result obtained.");
        return base64Output;
      }
      return result;
    } catch (err) {
      console.error("❌ matting error:", err.message);
      if (err.response) {
        console.error("❌ API Response Status:", err.response.status);
        console.error("❌ API Response Data:", this.decrypt(err.response.data) || err.response.data);
      }
      return null;
    }
  }
  async pollingTask(fileID) {
    const interval = 3e3;
    let attempts = 0;
    const maxAttempts = 20;
    console.log(`⏳ Starting polling task for fileID: ${fileID}`);
    while (attempts < maxAttempts) {
      attempts++;
      const payload = this.createSignData({
        fileID: fileID,
        type: "matting"
      });
      const apiHeaders = this.buildHeaders({
        "content-type": "application/json",
        accept: "application/json, text/plain, */*"
      });
      try {
        await new Promise(resolve => setTimeout(resolve, interval));
        console.log(`📡 Polling attempt ${attempts}/${maxAttempts} for fileID: ${fileID}`);
        const res = await axios.post(`${this.baseUrl}/api/images/result`, payload, {
          headers: apiHeaders
        });
        const decryptedResponse = this.decrypt(res.data);
        if (!decryptedResponse) {
          console.warn("⚠️ Polling: Decrypted response is empty. Retrying...");
          continue;
        }
        const raw = JSON.parse(decryptedResponse);
        const results = raw?.results;
        if (results?.recommend?.image) {
          console.log("✅ Polling successful: Recommend image found.");
          return {
            base: this.baseUrl,
            original: results.original?.image ? {
              url: this.baseUrl + results.original.image,
              width: results.original.width,
              height: results.original.height,
              type: results.original.type
            } : null,
            recommend: {
              url: this.baseUrl + results.recommend.image,
              model: results.recommend.model
            }
          };
        } else if (raw?.status === "processing" || raw?.status === "pending" || raw?.code === 10003) {
          console.log(`⏳ Polling: Status is '${raw?.status || "unknown (code: " + raw?.code + ")"}'. Retrying...`);
        } else if (raw?.code !== 0 && raw?.message) {
          console.error(`❌ Polling API error: ${raw.message} (code: ${raw.code})`);
          return null;
        } else {
          console.log("⏳ Polling: Recommend image not yet available or unexpected response structure. Retrying...", raw);
        }
      } catch (err) {
        console.error("❌ Polling task error during attempt:", err.message);
        if (err.response) {
          console.error("❌ API Response Status (Polling):", err.response.status);
          console.error("❌ API Response Data (Polling):", this.decrypt(err.response.data) || err.response.data);
          if (err.response.status >= 500) {
            console.error("❌ Server error during polling. Aborting.");
            return null;
          }
        }
      }
    }
    console.warn(`⚠️ Polling task max attempts reached for fileID: ${fileID}.`);
    return null;
  }
  async getBase64(imageObject) {
    try {
      if (!imageObject || !imageObject.recommend || !imageObject.recommend.url) {
        throw new Error("Invalid image object provided to getBase64. Missing recommend.url");
      }
      const imagePath = imageObject.recommend.url.startsWith(imageObject.base) ? imageObject.recommend.url.substring(imageObject.base.length) : imageObject.recommend.url;
      console.log(`⚙️ Requesting base64 for image path: ${imagePath}`);
      const payload = this.createSignData({
        image: imagePath
      });
      const apiHeaders = this.buildHeaders({
        "content-type": "application/json",
        accept: "application/json, text/plain, */*"
      });
      const res = await axios.post(`${this.baseUrl}/api/images/base64`, payload, {
        headers: apiHeaders
      });
      const decryptedResponse = this.decrypt(res.data);
      if (!decryptedResponse) throw new Error("Failed to decrypt base64 response or response was empty.");
      const parsedData = JSON.parse(decryptedResponse);
      if (parsedData && parsedData.base64) {
        console.log("✅ Base64 data received successfully.");
        return `data:image/png;base64,${parsedData.base64}`;
      } else {
        throw new Error("Base64 data not found in the response or unexpected structure.");
      }
    } catch (err) {
      console.error("❌ getBase64 error:", err.message);
      if (err.response) {
        console.error("❌ API Response Status (getBase64):", err.response.status);
        console.error("❌ API Response Data (getBase64):", this.decrypt(err.response.data) || err.response.data);
      }
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' is required"
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