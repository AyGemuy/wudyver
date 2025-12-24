import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class ScreenshotMachine {
  constructor() {
    this.api = {
      base: "https://www.screenshotmachine.com",
      ocr: "https://demo.api4ai.cloud/ocr/v1/results"
    };
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    this.headers = {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K)",
      "x-requested-with": "XMLHttpRequest"
    };
    this.cookie = "";
  }
  createHeaders(type = "json") {
    const headers = {
      ...this.headers,
      referer: `${this.api.base}/`
    };
    if (this.cookie) {
      headers.cookie = `${this.cookie}; homepage-tab=screenshot`;
    }
    if (type === "image") {
      headers.accept = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
      headers["sec-fetch-dest"] = "image";
      headers["sec-fetch-mode"] = "no-cors";
    } else {
      headers.accept = "*/*";
      headers["content-type"] = "application/x-www-form-urlencoded; charset=UTF-8";
      headers["sec-fetch-dest"] = "empty";
      headers["sec-fetch-mode"] = "cors";
    }
    return headers;
  }
  async getCookies() {
    try {
      const response = await axios.get(this.api.base, {
        headers: this.createHeaders()
      });
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        this.cookie = setCookieHeader[0].split(";")[0];
      }
    } catch (error) {
      console.error(`❌ Gagal mengambil cookie: ${error.message}`);
      throw error;
    }
  }
  async fetchCaptcha() {
    try {
      await this.getCookies();
      const response = await axios.get(`${this.api.base}/simple-php-captcha.php?_CAPTCHA&${Date.now()}`, {
        headers: this.createHeaders("image"),
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Gagal mengambil CAPTCHA: ${error.message}`);
      throw error;
    }
  }
  async uploadImage(buffer, mimeType = "image/png", fileName = "image.png") {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mimeType
      }), fileName);
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers ? formData.headers : {}
        }
      });
      if (!uploadResponse) {
        throw new Error("Upload failed");
      }
      return uploadResponse;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error uploading image: Server responded with status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("Error uploading image: No response received from server.");
      } else {
        throw new Error("Error uploading image: " + error.message);
      }
    }
  }
  async ocr(url) {
    let captchaText = null;
    let attempts = 0;
    while (!captchaText && attempts < 5) {
      try {
        const formData = new FormData();
        formData.append("url", url);
        const response = await axios.post(this.api.ocr, formData, {
          headers: this.createHeaders()
        });
        captchaText = this.extractText(response.data);
        if (captchaText) return captchaText;
        attempts++;
      } catch (error) {
        console.error(`❌ Gagal melakukan OCR: ${error.message}`);
      }
    }
    throw new Error("Gagal membaca teks captcha setelah 5 percobaan.");
  }
  extractText(data) {
    try {
      return data?.results?.flatMap(res => res.entities)?.filter(ent => ent.kind === "objects" && ent.name === "text")?.flatMap(ent => ent.objects)?.flatMap(obj => obj.entities)?.find(ent => ent.kind === "text")?.text || null;
    } catch (error) {
      console.error(`❌ Error extracting OCR text: ${error.message}`);
      return null;
    }
  }
  async captureScreenshot(captchaText, url, device, full) {
    try {
      const formData = new FormData();
      formData.append("url", url);
      formData.append("device", device);
      formData.append("full", full ? "on" : "off");
      formData.append("cacheLimit", "0");
      formData.append("captcha", captchaText);
      const response = await axios.post(`${this.api.base}/capture.php`, formData, {
        headers: this.createHeaders()
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Gagal mengambil screenshot: ${error.message}`);
      throw error;
    }
  }
  async fetchResult() {
    try {
      const response = await axios.get(`${this.api.base}/serve.php?file=result&t=${Date.now()}`, {
        headers: this.createHeaders("image"),
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Gagal mengambil hasil screenshot: ${error.message}`);
      throw error;
    }
  }
  async screenshot({
    url,
    device = "desktop",
    full = true
  }) {
    try {
      console.log(`🖼 Memulai proses screenshot untuk ${url}`);
      const captchaBuffer = await this.fetchCaptcha();
      const captchaUrl = await this.uploadImage(captchaBuffer);
      console.log(`🔠 Memulai OCR...`);
      const captchaText = await this.ocr(captchaUrl);
      console.log(`📸 Mengambil screenshot...`);
      const screenshotData = await this.captureScreenshot(captchaText, url, device, full);
      if (screenshotData.status !== "success") throw new Error("Screenshot gagal diambil.");
      const resultBuffer = await this.fetchResult();
      const uploadedUrl = await this.uploadImage(resultBuffer);
      return uploadedUrl ? {
        status: "success",
        url: uploadedUrl
      } : {
        status: "error",
        message: "Gagal mengunggah hasil."
      };
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      return {
        status: "error",
        message: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const sm = new ScreenshotMachine();
  try {
    const data = await sm.screenshot(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}