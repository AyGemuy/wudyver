import OSS from "ali-oss";
import axios from "axios";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import SpoofHead from "@/lib/spoof-head";
class ImageSuperRes {
  constructor() {
    this.baseURL = "https://shoppic.en.api.qingning6.com";
    this.cookieJar = new CookieJar();
    this.defaultHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      platform: "web",
      origin: "https://www.picsman.ai",
      referer: "https://www.picsman.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      ...SpoofHead()
    };
    this.client = wrapper(axios.create({
      baseURL: this.baseURL,
      headers: this.defaultHeaders,
      withCredentials: true,
      jar: this.cookieJar,
      timeout: 3e4,
      maxContentLength: 10485760
    }));
    this.signData = null;
  }
  async getSign() {
    try {
      console.log("🔄 Getting OSS signature...");
      const specificHeaders = {
        ...this.defaultHeaders,
        versioncode: "200",
        env: "",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        ua: "web"
      };
      const response = await this.client.get("/api/get/wto/sign", {
        headers: specificHeaders,
        timeout: 1e4
      });
      if (response.data?.ret !== 0) {
        throw new Error(`Sign API error: ${response.data?.errorMsg || response.data?.msg || "Unknown error"}`);
      }
      this.signData = response.data?.result;
      if (!this.signData?.security_token || !this.signData?.signature || !this.signData?.x_oss_credential) {
        throw new Error("Invalid sign response: missing required fields");
      }
      console.log("✅ OSS signature obtained");
      return this.signData;
    } catch (error) {
      console.error("❌ Failed to get OSS signature:", error.message);
      throw new Error(`Sign failed: ${error.message}`);
    }
  }
  async uploadToOSS(imageData, signData) {
    try {
      console.log("🔄 Uploading image to OSS using direct POST...");
      if (!signData?.security_token || !signData?.policy || !signData?.x_oss_credential) {
        throw new Error("Invalid sign data for OSS upload");
      }
      let buffer;
      if (typeof imageData === "string" && imageData.startsWith("http")) {
        console.log("📥 Downloading image from URL...");
        const response = await axios.get(imageData, {
          responseType: "arraybuffer",
          timeout: 3e4,
          maxContentLength: 10485760
        });
        buffer = Buffer.from(response.data);
      } else if (typeof imageData === "string" && imageData.startsWith("data:")) {
        console.log("📥 Processing base64 image...");
        const base64Data = imageData.split(",")[1];
        if (!base64Data) {
          throw new Error("Invalid base64 data format");
        }
        buffer = Buffer.from(base64Data, "base64");
      } else if (Buffer.isBuffer(imageData)) {
        console.log("📥 Processing buffer image...");
        buffer = imageData;
      } else {
        throw new Error("Unsupported image data type");
      }
      if (buffer.length > 10 * 1024 * 1024) {
        throw new Error("Image size exceeds 10MB limit");
      }
      if (buffer.length === 0) {
        throw new Error("Empty image data");
      }
      const fileExt = this.getImageExtension(imageData);
      const fileName = `${signData.dir}/upscale/${this.generateUUID()}.${fileExt}`;
      const formData = new FormData();
      formData.append("key", fileName);
      formData.append("x-oss-security-token", signData.security_token);
      formData.append("x-oss-signature-version", signData.version);
      formData.append("x-oss-credential", signData.x_oss_credential);
      formData.append("x-oss-date", signData.x_oss_date);
      formData.append("policy", signData.policy);
      formData.append("x-oss-signature", signData.signature);
      formData.append("success_action_status", "200");
      formData.append("file", buffer, {
        filename: `upload.${fileExt}`,
        contentType: `image/${fileExt}`
      });
      const uploadUrl = signData.host;
      console.log("📤 Uploading to:", uploadUrl);
      const uploadResponse = await axios.post(uploadUrl, formData, {
        headers: {
          ...formData.getHeaders()
        },
        maxBodyLength: 10 * 1024 * 1024,
        maxContentLength: 10 * 1024 * 1024,
        timeout: 6e4
      });
      const resultUrl = `${signData.host}/${fileName}`;
      console.log("✅ Image uploaded to OSS:", resultUrl);
      return resultUrl;
    } catch (error) {
      console.error("❌ OSS upload failed:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw new Error(`OSS upload failed: ${error.message}`);
    }
  }
  async submitTask(imgUrl) {
    try {
      console.log("🔄 Submitting super resolution task...");
      if (!imgUrl) {
        throw new Error("No image URL provided for task submission");
      }
      const formData = new FormData();
      formData.append("imgUrl", imgUrl);
      formData.append("taskId", "");
      formData.append("upscaler_type", "");
      formData.append("need_restore_face", "false");
      formData.append("need_resize", "false");
      formData.append("sbType", "SUPER_RESOLUTION");
      const response = await this.client.post("/api/tools/doImageSuperResolution/v2", formData, {
        headers: {
          ...formData.getHeaders(),
          "bk-cc": "HK",
          "bk-version": "3.1.0",
          channel: "web",
          deviceid: "0",
          expires: "0",
          language: "en",
          locale: "id-ID",
          "pay-channel-web": "stripe",
          versioncode: "100",
          ua: "08d248cdc6d614245081f40888e18867"
        },
        timeout: 3e4
      });
      if (response.data?.ret !== 0) {
        throw new Error(`Task submission failed: ${response.data?.errorMsg || response.data?.msg || "Unknown error"}`);
      }
      const taskId = response.data?.result?.taskId;
      if (!taskId) {
        throw new Error("No task ID returned from submission");
      }
      console.log("✅ Task submitted, ID:", taskId);
      return taskId;
    } catch (error) {
      console.error("❌ Task submission failed:", error.message);
      throw new Error(`Task submission failed: ${error.message}`);
    }
  }
  async pollResult(taskId, maxAttempts = 30, interval = 2e3) {
    try {
      console.log("🔄 Polling for result...");
      if (!taskId) {
        throw new Error("No task ID provided for polling");
      }
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`📊 Polling attempt ${attempt}/${maxAttempts}`);
        try {
          const response = await this.client.get("/api/tools/superResolution/result", {
            params: {
              taskId: taskId,
              oriImgUrlMd5: ""
            },
            headers: {
              "bk-cc": "HK",
              "bk-version": "3.1.0",
              channel: "web",
              deviceid: "0",
              expires: "0",
              language: "en",
              locale: "id-ID",
              "pay-channel-web": "stripe",
              versioncode: "100",
              ua: "08d248cdc6d614245081f40888e18867"
            },
            timeout: 1e4
          });
          const result = response.data?.result;
          if (response.data?.ret !== 0) {
            const errorMsg = response.data?.errorMsg || response.data?.msg;
            if (errorMsg && !errorMsg.includes("processing")) {
              throw new Error(`API error: ${errorMsg}`);
            }
          }
          if (result?.imgUrl || result?.data?.upsample_image) {
            const resultUrl = result.imgUrl || result.data?.upsample_image;
            console.log("✅ Super resolution completed!");
            return {
              resultUrl: resultUrl,
              fullResult: response.data,
              taskId: result.taskId,
              quota: result.quota
            };
          }
          if (result?.code && result.code !== 0) {
            console.log(`⏳ Task status code: ${result.code}`);
          } else {
            console.log("⏳ Task still processing...");
          }
        } catch (pollError) {
          console.log("⚠️ Polling error, retrying...", pollError.message);
        }
        if (attempt < maxAttempts) {
          await this.delay(interval);
        }
      }
      throw new Error(`Polling timeout after ${maxAttempts} attempts`);
    } catch (error) {
      console.error("❌ Result polling failed:", error.message);
      throw new Error(`Result polling failed: ${error.message}`);
    }
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    let taskId = null;
    let ossUrl = null;
    try {
      console.log("🚀 Starting super resolution process...");
      if (!imageUrl) {
        throw new Error("imageUrl is required");
      }
      const signData = await this.getSign();
      ossUrl = await this.uploadToOSS(imageUrl, signData);
      taskId = await this.submitTask(ossUrl);
      const pollResult = await this.pollResult(taskId);
      console.log("🎉 Super resolution completed successfully!");
      return {
        success: true,
        enhancedUrl: pollResult.resultUrl,
        originalUrl: imageUrl,
        ossUrl: ossUrl,
        taskId: taskId,
        quota: pollResult.quota,
        fullResponse: pollResult.fullResult,
        timestamp: new Date().toISOString(),
        metadata: {
          imageType: this.getImageExtension(imageUrl),
          processingTime: Date.now() - (rest.startTime || Date.now())
        }
      };
    } catch (error) {
      console.error("💥 Super resolution failed:", error.message);
      return {
        success: false,
        error: error.message,
        originalUrl: imageUrl,
        ossUrl: ossUrl || null,
        taskId: taskId || null,
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      };
    }
  }
  getImageExtension(imageData) {
    if (!imageData) return "jpg";
    if (typeof imageData === "string") {
      if (imageData.startsWith("data:")) {
        const mimeType = imageData.split(";")[0]?.split("/")[1];
        return mimeType || "jpg";
      }
      if (imageData.startsWith("http")) {
        const extension = imageData.split(".").pop()?.split("?")[0]?.toLowerCase();
        return ["jpg", "jpeg", "png", "webp", "gif"].includes(extension) ? extension : "jpg";
      }
    }
    return "jpg";
  }
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    const api = new ImageSuperRes();
    const result = await api.generate(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}