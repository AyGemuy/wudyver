import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import OSS from "ali-oss";
import crypto from "crypto";
class ImageEditorAPI {
  constructor() {
    this.baseURL = "https://imageeditor.online";
    this.cookieJar = new CookieJar();
    this.axios = axios.create({
      baseURL: this.baseURL,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID",
        Accept: "*/*",
        "Sec-Ch-Ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      }
    });
    this.initAnonymousUserId();
    this.setupInterceptors();
  }
  setupInterceptors() {
    this.axios.interceptors.request.use(async config => {
      console.log(`Proses: ${config.method?.toUpperCase()} ${config.url}`);
      const cookies = await this.cookieJar.getCookieString(config.baseURL || this.baseURL);
      if (cookies) {
        config.headers.Cookie = config.headers.Cookie ? `${config.headers.Cookie}; ${cookies}` : cookies;
      }
      return config;
    });
    this.axios.interceptors.response.use(response => {
      const setCookie = response.headers["set-cookie"];
      if (setCookie) {
        setCookie.forEach(cookie => {
          this.cookieJar.setCookieSync(cookie, response.config.baseURL || this.baseURL);
        });
      }
      return response;
    }, async error => {
      if (error.response?.data?.code === 100002) {
        console.log("Login expired, regenerating anonymous user ID...");
        await this.regenerateAnonymousUserId();
        return this.axios(error.config);
      }
      return Promise.reject(error);
    });
  }
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  initAnonymousUserId() {
    let anonymousId = this.generateUUID();
    const cookie = `anonymous_user_id=${anonymousId}; Path=/; Domain=.imageeditor.online`;
    this.cookieJar.setCookieSync(cookie, this.baseURL);
    console.log("Generated anonymous user ID:", anonymousId);
  }
  async regenerateAnonymousUserId() {
    const newAnonymousId = this.generateUUID();
    const cookie = `anonymous_user_id=${newAnonymousId}; Path=/; Domain=.imageeditor.online`;
    this.cookieJar.setCookieSync(cookie, this.baseURL);
    this.axios.defaults.headers.common["Cookie"] = this.axios.defaults.headers.common["Cookie"]?.replace(/anonymous_user_id=[^;]+/, `anonymous_user_id=${newAnonymousId}`) || `anonymous_user_id=${newAnonymousId}`;
    console.log("Regenerated anonymous user ID:", newAnonymousId);
    return newAnonymousId;
  }
  async getStsToken() {
    try {
      console.log("Mengambil STS token...");
      const response = await this.axios.get("/api/v1/oss/sts-token", {
        headers: {
          Referer: "https://imageeditor.online/ai-models/nano-banana-pro",
          Priority: "u=1, i",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin"
        }
      });
      if (response.data?.code !== 1e5) {
        throw new Error(`STS token error: ${response.data?.message || "Unknown error"}`);
      }
      return response.data?.data;
    } catch (error) {
      console.error("Error mengambil STS token:", error.message);
      if (error.response?.data?.code === 100002) {
        throw new Error("Login expired, regenerating session...");
      }
      throw error;
    }
  }
  async uploadToOSS(buffer, filename, stsData) {
    try {
      console.log(`Upload file ${filename} ke OSS...`);
      const client = new OSS({
        region: "oss-us-west-1",
        accessKeyId: stsData.AccessKeyId,
        accessKeySecret: stsData.AccessKeySecret,
        stsToken: stsData.SecurityToken,
        bucket: "nc-cdn",
        secure: true
      });
      const ossPath = `imageeditor/user-upload/${filename}`;
      const result = await client.put(ossPath, buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "x-oss-object-acl": "public-read"
        }
      });
      const cdnUrl = `https://cdn.imageeditor.online/${ossPath}`;
      console.log(`Upload berhasil: ${cdnUrl}`);
      return cdnUrl;
    } catch (error) {
      console.error("Error upload ke OSS:", error.message);
      throw error;
    }
  }
  async createSign(params, secretKey = "nc_mt_ai_image") {
    try {
      console.log("Membuat signature...");
      const sortedKeys = Object.keys(params).sort().filter(key => params[key] !== undefined && params[key] !== null);
      const paramString = sortedKeys.map(key => {
        const value = params[key];
        if (Array.isArray(value)) {
          return `${key}=[${value.map(item => `${item}`).join(", ")}]`;
        }
        return `${key}=${value}`;
      }).join("&");
      const hmac = crypto.createHmac("sha256", secretKey);
      hmac.update(paramString);
      return hmac.digest("hex");
    } catch (error) {
      console.error("Error membuat signature:", error.message);
      throw error;
    }
  }
  async startPrediction(imageUrls, prompt, type = 61, subType = 2) {
    try {
      console.log("Memulai prediction...");
      const timestamp = Math.floor(Date.now() / 1e3);
      const params = {
        image_urls: Array.isArray(imageUrls) ? imageUrls : imageUrls ? [imageUrls] : [],
        type: type,
        user_prompt: prompt || "",
        sub_type: subType,
        aspect_ratio: "",
        num: "",
        max_images: 1,
        size: "",
        t: timestamp,
        sig_version: "v1"
      };
      const sign = await this.createSign(params);
      const response = await this.axios.post("/api/v1/prediction/handle", {
        ...params,
        sign: sign
      }, {
        headers: {
          "Content-Type": "application/json",
          Referer: "https://imageeditor.online/ai-models/nano-banana-pro",
          Origin: "https://imageeditor.online",
          Priority: "u=1, i"
        }
      });
      if (response.data?.code !== 1e5) {
        throw new Error(`Prediction error: ${response.data?.message || "Unknown error"}`);
      }
      return response.data?.data?.session_id;
    } catch (error) {
      console.error("Error memulai prediction:", error.message);
      throw error;
    }
  }
  async pollStatus(sessionId, type = 61, subType = 2) {
    try {
      console.log("Polling status prediction...");
      const response = await this.axios.get("/api/v1/prediction/get-status", {
        params: {
          session_id: sessionId,
          type: type,
          sub_type: subType
        },
        headers: {
          Referer: "https://imageeditor.online/ai-models/nano-banana-pro",
          Priority: "u=1, i"
        }
      });
      if (response.data?.code !== 1e5) {
        throw new Error(`Status polling error: ${response.data?.message || "Unknown error"}`);
      }
      const data = response.data?.data;
      console.log(`Status: ${data?.status}`);
      if (data?.status === "succeeded") {
        return data.results?.[0]?.urls || [];
      }
      return null;
    } catch (error) {
      console.error("Error polling status:", error.message);
      throw error;
    }
  }
  async waitForCompletion(sessionId, type = 61, subType = 2, maxAttempts = 60, interval = 3e3) {
    console.log("Menunggu hasil generate...");
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Polling attempt ${attempt}/${maxAttempts}...`);
        const urls = await this.pollStatus(sessionId, type, subType);
        if (urls) {
          console.log("Generate selesai!");
          return urls;
        }
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } catch (error) {
        console.error(`Error pada attempt ${attempt}:`, error.message);
        if (error.response?.data?.code === 100002) {
          throw error;
        }
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
    }
    throw new Error("Timeout menunggu hasil generate");
  }
  async processImageInput(imageInput) {
    console.log("Memproses input image...");
    try {
      if (Buffer.isBuffer(imageInput)) {
        return imageInput;
      }
      if (typeof imageInput === "string") {
        if (imageInput.startsWith("data:")) {
          const matches = imageInput.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (!matches || matches.length !== 3) {
            throw new Error("Invalid base64 data URL");
          }
          return Buffer.from(matches[2], "base64");
        } else if (imageInput.startsWith("http")) {
          const response = await this.axios.get(imageInput, {
            responseType: "arraybuffer",
            headers: {
              Referer: "https://imageeditor.online/"
            }
          });
          return Buffer.from(response.data);
        }
      }
      throw new Error("Format image tidak didukung");
    } catch (error) {
      console.error("Error memproses image input:", error.message);
      throw error;
    }
  }
  async generate({
    prompt,
    imageUrl,
    type = 61,
    subType = 2,
    ...rest
  }) {
    let retryCount = 0;
    const maxRetries = 2;
    while (retryCount <= maxRetries) {
      try {
        console.log(`Memulai proses generate (attempt ${retryCount + 1})...`);
        const stsData = await this.getStsToken();
        if (!stsData?.AccessKeyId) {
          throw new Error("Gagal mendapatkan STS token yang valid");
        }
        const imageUrls = [];
        const imageInputs = imageUrl ? Array.isArray(imageUrl) ? imageUrl : [imageUrl] : [];
        for (const input of imageInputs) {
          try {
            console.log(`Memproses image ${imageUrls.length + 1}/${imageInputs.length}...`);
            const buffer = await this.processImageInput(input);
            const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.jpg`;
            const url = await this.uploadToOSS(buffer, filename, stsData);
            imageUrls.push(url);
            console.log(`Image berhasil diupload: ${filename}`);
          } catch (error) {
            console.error(`Error memproses image:`, error.message);
            throw error;
          }
        }
        const sessionId = await this.startPrediction(imageUrls.length > 0 ? imageUrls : undefined, prompt, type, subType);
        if (!sessionId) {
          throw new Error("Gagal memulai prediction: tidak ada session ID");
        }
        console.log(`Prediction dimulai dengan session ID: ${sessionId}`);
        const resultUrls = await this.waitForCompletion(sessionId, type, subType);
        return {
          success: true,
          sessionId: sessionId,
          imageUrls: resultUrls,
          originalImageUrls: imageUrls,
          message: "Generate berhasil"
        };
      } catch (error) {
        console.error(`Error dalam proses generate (attempt ${retryCount + 1}):`, error.message);
        if (error.response?.data?.code !== 100002 || retryCount >= maxRetries) {
          return {
            success: false,
            error: error.message,
            code: error.response?.data?.code,
            retryCount: retryCount + 1
          };
        }
        retryCount++;
        console.log(`Login expired, retrying (${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1e3));
      }
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new ImageEditorAPI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}