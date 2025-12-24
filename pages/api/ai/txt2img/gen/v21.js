import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class VideoWebClient {
  constructor() {
    this.axiosInstance = axios.create({
      timeout: 6e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9",
        Accept: "*/*",
        "X-Forwarded-For": this.generateRandomIp(),
        "X-Client-IP": this.generateRandomIp()
      }
    });
    this.setupInterceptors();
    this.cookies = {};
    this.bearerToken = null;
    this.email = null;
    this.emailUuid = null;
    this.password = `P@ssw0rd${Math.floor(Math.random() * 1e6)}`;
    this.userName = `User${Math.floor(Math.random() * 1e6)}`;
  }
  generateRandomIp() {
    return Array.from({
      length: 4
    }, () => Math.floor(Math.random() * 255) + 1).join(".");
  }
  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(config => {
      if (Object.keys(this.cookies).length > 0) {
        config.headers["Cookie"] = Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
      }
      if (this.bearerToken && !config.headers["Authorization"]) {
        config.headers["Authorization"] = `Bearer ${this.bearerToken}`;
      }
      return config;
    }, error => Promise.reject(error));
    this.axiosInstance.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        console.log("🍪 Set-Cookie Header Received:", setCookieHeader);
        setCookieHeader.forEach(cookie => {
          const [cookiePair] = cookie.split(";");
          const [name, value] = cookiePair.split("=");
          if (name && value) {
            const trimmedName = name.trim();
            const trimmedValue = value.trim();
            this.cookies[trimmedName] = trimmedValue;
            console.log(`🍪 Cookie Updated: ${trimmedName}=${trimmedValue}`);
            if (trimmedName.toLowerCase().includes("authorization") && trimmedValue.match(/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)) {
              if (!this.bearerToken) {
                this.bearerToken = trimmedValue;
                console.log("✅ Bearer token extracted from cookie!");
              }
            }
          }
        });
      }
      return response;
    }, error => Promise.reject(error));
  }
  async createTempEmail() {
    try {
      const response = await this.axiosInstance.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      this.email = response.data.email;
      this.emailUuid = response.data.uuid;
      console.log("✅ Email created:", this.email);
      console.log("📦 Create Email Response Data (Partial):", JSON.stringify({
        email: response.data.email,
        uuid: response.data.uuid
      }, null, 2));
      return response.data;
    } catch (error) {
      console.error("❌ Failed to create email:", error.message);
      throw error;
    }
  }
  async sendOTP() {
    try {
      const payload = [{
        email: this.email,
        userName: this.userName,
        password: this.password
      }];
      const response = await this.axiosInstance.post("https://videoweb.ai/ghibli-studio/", payload, {
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
          "Next-Action": "424401cbe4e8b1b79045e4ac3dcf3d788c2156dd",
          "Next-Router-State-Tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22(with-footer)%22%2C%7B%22children%22%3A%5B%22ghibli-studio%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fghibli-studio%2F%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%5D",
          Origin: "https://videoweb.ai",
          Referer: "https://videoweb.ai/ghibli-studio/"
        }
      });
      console.log("✅ OTP sent to:", this.email);
      console.log("📦 Send OTP Response Status:", response.status);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to send OTP:", error.message);
      throw error;
    }
  }
  async pollForOTP(maxAttempts = 60, intervalMs = 3e3) {
    console.log("🔄 Polling for OTP...");
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.axiosInstance.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${this.email}`);
        if (response.data.data && response.data.data.length > 0) {
          const message = response.data.data[0];
          console.log(`📦 Poll OTP Message (Attempt ${attempt}):`, message.text_content ? message.text_content.substring(0, 100) + "..." : "[No content]");
          const otpMatch = message.text_content.match(/Security code:\s*(\d+)/);
          if (otpMatch) {
            const otp = otpMatch[1];
            console.log("✅ OTP received:", otp);
            return otp;
          }
        } else {
          console.log(`📦 Poll OTP Response Data (Attempt ${attempt}): [No new messages]`);
        }
        console.log(`⏳ Attempt ${attempt}/${maxAttempts} - No OTP yet, waiting...`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error) {
        console.error(`❌ Error polling OTP (attempt ${attempt}):`, error.message);
        if (attempt === maxAttempts) {
          throw new Error("Failed to receive OTP after maximum attempts");
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    throw new Error("OTP polling timeout");
  }
  async verifyOTP(otp) {
    try {
      const payload = [{
        email: this.email,
        emailCode: otp
      }];
      const response = await this.axiosInstance.post("https://videoweb.ai/ghibli-studio/", payload, {
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
          "Next-Action": "efbaa6169049c8cb5fd4fd1abe810d880738ab19",
          "Next-Router-State-Tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22(with-footer)%22%2C%7B%22children%22%3A%5B%22ghibli-studio%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fghibli-studio%2F%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%5D",
          Origin: "https://videoweb.ai",
          Referer: "https://videoweb.ai/ghibli-studio/"
        }
      });
      console.log("✅ OTP verified successfully");
      console.log("📦 Verify OTP Response Status:", response.status);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to verify OTP:", error.message);
      throw error;
    }
  }
  async login() {
    try {
      const payload = [{
        email: this.email,
        password: this.password
      }];
      const response = await this.axiosInstance.post("https://videoweb.ai/ghibli-studio/", payload, {
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
          "Next-Action": "1c7778f900ce2db3f2c455a90e709ef29ae30db3",
          "Next-Router-State-Tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22(with-footer)%22%2C%7B%22children%22%3A%5B%22ghibli-studio%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fghibli-studio%2F%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%5D",
          Origin: "https://videoweb.ai",
          Referer: "https://videoweb.ai/ghibli-studio/"
        }
      });
      const responseText = JSON.stringify(response.data);
      const bearerMatch = responseText.match(/\.ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      if (bearerMatch) {
        if (!this.bearerToken) {
          this.bearerToken = "eyJ" + bearerMatch[0].substring(1);
          console.log("✅ Bearer token extracted from response body");
        } else {
          console.log("✅ Bearer token already set (from cookie). Skipping extraction from response body.");
        }
        console.log("Bearer Token:", this.bearerToken);
      } else {
        console.warn("⚠️ Bearer token not found in response body");
      }
      console.log("✅ Login successful");
      return response.data;
    } catch (error) {
      console.error("❌ Failed to login:", error.message);
      throw error;
    }
  }
  async getPresignedUrl() {
    try {
      const payload = {
        site: "videoweb.ai",
        mineType: ["image/webp"]
      };
      const response = await this.axiosInstance.post("https://api2.tap4.ai/image/presignedUrl", payload, {
        headers: {
          "Content-Type": "application/json",
          Credentials: "include",
          Origin: "https://videoweb.ai",
          Referer: "https://videoweb.ai/"
        }
      });
      console.log("📦 Get Presigned URL Response Data (Rows):", JSON.stringify(response.data.rows, null, 2));
      if (response.data && response.data.rows && response.data.rows.length > 0) {
        console.log("✅ Presigned URL obtained");
        return response.data.rows[0];
      } else {
        throw new Error("No presigned URL data found in response.");
      }
    } catch (error) {
      console.error("❌ Failed to get presigned URL:", error.message);
      throw error;
    }
  }
  async uploadImage(imageBuffer, presignedData) {
    const signedUrlObj = new URL(presignedData.signedUrl);
    const urlParams = new URLSearchParams(signedUrlObj.search);
    const xAmzDateFromUrl = urlParams.get("X-Amz-Date");
    const xAmzSignedHeadersFromUrl = urlParams.get("X-Amz-SignedHeaders");
    const uploadHeaders = {
      "Content-Type": "image/webp",
      Origin: "https://videoweb.ai",
      Referer: "https://videoweb.ai/"
    };
    if (xAmzDateFromUrl) {
      uploadHeaders["X-Amz-Date"] = xAmzDateFromUrl;
      console.log(`✨ Using X-Amz-Date from URL: ${xAmzDateFromUrl}`);
    } else {
      const now = new Date();
      const amzDateFormatted = now.toISOString().replace(/[:-]|\.\d{3}/g, "").substring(0, 15) + "Z";
      uploadHeaders["X-Amz-Date"] = amzDateFormatted;
      console.log(`✨ X-Amz-Date not found in URL, using current date: ${amzDateFormatted}`);
    }
    uploadHeaders["Date"] = new Date().toUTCString();
    console.log(`✨ Using standard Date header: ${uploadHeaders["Date"]}`);
    try {
      const sha256Hash = crypto.createHash("sha256").update(imageBuffer).digest("hex");
      console.log(`✨ Calculated x-amz-content-sha256: ${sha256Hash}`);
      uploadHeaders["X-Amz-Content-Sha256"] = sha256Hash;
    } catch (e) {
      console.error("❌ FATAL: Failed to calculate SHA256 hash. Upload will fail:", e.message);
      throw new Error("Failed to calculate X-Amz-Content-Sha256 hash, upload impossible.");
    }
    try {
      const response = await this.axiosInstance.put(presignedData.signedUrl, imageBuffer, {
        headers: uploadHeaders
      });
      console.log("✅ Image uploaded successfully");
      console.log("📦 Upload Image Response Status:", response.status);
      return response;
    } catch (error) {
      if (error.response) {
        console.error("❌ Upload Error Response Data:", JSON.stringify(error.response.data, null, 2));
        console.error("❌ Upload Error Response Headers:", error.response.headers);
      }
      console.error("❌ Failed to upload image:", error.message);
      throw error;
    }
  }
  async startImageGeneration({
    imageUrlList,
    prompt,
    outputPrompt,
    platformType,
    modelName,
    width,
    height,
    styleName,
    isPublic,
    imageType,
    ...rest
  }) {
    try {
      const payload = {
        site: "videoweb.ai",
        prompt: prompt,
        outputPrompt: outputPrompt || prompt,
        platformType: platformType,
        modelName: modelName,
        width: width,
        height: height,
        styleName: styleName,
        isPublic: isPublic,
        imageUrlList: imageUrlList,
        imageType: imageType,
        ...rest
      };
      const response = await this.axiosInstance.post("https://api2.tap4.ai/image/generator4login/async", payload, {
        headers: {
          "Content-Type": "application/json",
          Credentials: "include",
          Origin: "https://videoweb.ai",
          Referer: "https://videoweb.ai/"
        }
      });
      console.log("✅ Image generation started, task key:", response.data.data.key);
      console.log("Task ID:", response.data.data.key);
      console.log("📦 Start Generation Response Data (Key):", JSON.stringify({
        key: response.data.data.key,
        status: response.data.data.status
      }, null, 2));
      return response.data.data.key;
    } catch (error) {
      console.error("❌ Failed to start image generation:", error.message);
      throw error;
    }
  }
  async pollTaskResult(taskKey, maxAttempts = 60, intervalMs = 3e3) {
    console.log("🔄 Polling for generation result...");
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.axiosInstance.get(`https://api2.tap4.ai/image/getResult/${taskKey}?site=videoweb.ai`, {
          headers: {
            "Content-Type": "application/json",
            Credentials: "include",
            Origin: "https://videoweb.ai",
            Referer: "https://videoweb.ai/"
          }
        });
        const status = response.data.data.status;
        if (status === "success") {
          console.log("✅ Generation completed successfully");
          console.log("📦 Poll Result Response Data (Success):", JSON.stringify(response.data.data.imageResponseVo, null, 2));
          return response.data.data;
        } else if (status === "failed") {
          console.log("📦 Poll Result Response Data (Failed):", JSON.stringify(response.data.data, null, 2));
          throw new Error("Generation failed");
        } else {
          console.log(`⏳ Attempt ${attempt}/${maxAttempts} - Status: ${status}, waiting...`);
          console.log("📦 Poll Result Response Data (Current Status):", JSON.stringify({
            key: response.data.data.key,
            status: response.data.data.status
          }, null, 2));
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error) {
        console.error(`❌ Error polling result (attempt ${attempt}):`, error.message);
        if (attempt === maxAttempts) {
          throw new Error("Failed to get result after maximum attempts");
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    throw new Error("Task polling timeout");
  }
  async downloadImageBuffer(imageUrl) {
    console.log("📥 Downloading input image...");
    try {
      const response = await this.axiosInstance.get(imageUrl, {
        responseType: "arraybuffer"
      });
      console.log("✅ Image download successful (received buffer)");
      return Buffer.from(response.data);
    } catch (error) {
      console.error("❌ Failed to download image:", error.message);
      throw error;
    }
  }
  async generate({
    prompt,
    outputPrompt,
    platformType = 38,
    modelName = "4o-image",
    width = 1,
    height = 1,
    styleName = "",
    isPublic = 1,
    imageUrl,
    imageUrlList = [],
    imageType = "ghiblify",
    ...rest
  }) {
    try {
      console.log("🚀 Starting Ghibli generation process...");
      console.log(`Using generated username: ${this.userName}`);
      console.log(`Using generated password: ${this.password}`);
      await this.createTempEmail();
      await this.sendOTP();
      const otp = await this.pollForOTP();
      await this.verifyOTP(otp);
      await this.login();
      if (!this.bearerToken) {
        throw new Error("Failed to obtain bearer token after login/verification.");
      }
      let finalImageUrlList = [];
      if (imageUrl) {
        console.log("📥 Downloading input image...");
        const originalImageBuffer = await this.downloadImageBuffer(imageUrl);
        const presignedData = await this.getPresignedUrl();
        console.log("⬆️ Uploading image to presigned URL...");
        await this.uploadImage(originalImageBuffer, presignedData);
        console.log("✅ Image upload complete.");
        finalImageUrlList.push(presignedData.url);
      } else if (imageUrlList && imageUrlList.length > 0) {
        console.log("🖼️ Processing multiple image URLs...");
        for (const singleImageUrl of imageUrlList) {
          console.log(`📥 Downloading image: ${singleImageUrl}`);
          const originalImageBuffer = await this.downloadImageBuffer(singleImageUrl);
          const presignedData = await this.getPresignedUrl();
          console.log(`⬆️ Uploading image to presigned URL: ${presignedData.signedUrl}`);
          await this.uploadImage(originalImageBuffer, presignedData);
          finalImageUrlList.push(presignedData.url);
          console.log(`✅ Image uploaded: ${presignedData.url}`);
        }
      } else {
        console.log("⚠️ No imageUrl or imageUrlList provided. Proceeding with empty image list. Generation might fail if images are required.");
      }
      const taskKey = await this.startImageGeneration({
        prompt: prompt,
        outputPrompt: outputPrompt,
        platformType: platformType,
        modelName: modelName,
        width: width,
        height: height,
        styleName: styleName,
        isPublic: isPublic,
        imageUrlList: finalImageUrlList,
        imageType: imageType,
        ...rest
      });
      const result = await this.pollTaskResult(taskKey);
      console.log("🎉 Generation process completed!");
      return {
        success: true,
        result: result.imageResponseVo,
        generatedImageUrl: result.imageResponseVo.url,
        thumbnailUrl: result.imageResponseVo.thumbnailUrl,
        prompt: result.imageResponseVo.prompt,
        resolution: result.imageResponseVo.resolution,
        costCredits: result.imageResponseVo.costCredits
      };
    } catch (error) {
      console.error("💥 Generation process failed:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const generator = new VideoWebClient();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}