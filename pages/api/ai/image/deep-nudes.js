import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import {
  URL
} from "url";
import {
  Blob,
  FormData
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class DeepNudesAPI {
  constructor() {
    this.emailData = null;
    this.cookieJar = new CookieJar();
    this.baseURL = "https://api.deep-nudes.com";
    this.emailServiceURL = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload?host=Catbox`;
    this.client = wrapper(axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://deep-nudes.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://deep-nudes.com/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      },
      jar: this.cookieJar
    }));
  }
  async makeEmail() {
    try {
      const res = await axios.get(`${this.emailServiceURL}?action=create`);
      this.emailData = res.data;
      console.log("Email created:", this.emailData.email);
      return this.emailData;
    } catch (err) {
      throw new Error(`Failed to create email: ${err.message}`);
    }
  }
  async reqLink() {
    if (!this.emailData) {
      throw new Error("Email must be created first. Call makeEmail() method.");
    }
    try {
      const res = await this.client.post(`${this.baseURL}/auth/magic-link`, {
        email: this.emailData.email
      });
      console.log("Magic link requested:", res.data.message);
      return res.data;
    } catch (err) {
      throw new Error(`Failed to request magic link: ${err.message}`);
    }
  }
  async getEmail() {
    if (!this.emailData) {
      throw new Error("Email must be created first. Call makeEmail() method.");
    }
    try {
      const res = await axios.get(`${this.emailServiceURL}?action=message&email=${this.emailData.email}`);
      return res.data;
    } catch (err) {
      throw new Error(`Failed to check email: ${err.message}`);
    }
  }
  getLink(emailRes) {
    if (!emailRes.data || emailRes.data.length === 0) return null;
    const emailContent = emailRes.data[0];
    if (!emailContent.text_content) return null;
    const linkRegex = /https:\/\/api\.deep-nudes\.com\/auth\/magic-login\?token=[^\s\r\n]+/;
    const match = emailContent.text_content.match(linkRegex);
    return match ? match[0] : null;
  }
  async authWithLink(magicLink) {
    try {
      const res = await this.client.get(magicLink);
      console.log("Authentication successful.");
      return res.data;
    } catch (err) {
      throw new Error(`Failed to authenticate with magic link: ${err.message}`);
    }
  }
  async waitAndAuth(maxAttempts = 10, interval = 3e3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Checking email... Attempt ${attempt}/${maxAttempts}`);
      try {
        const emailRes = await this.getEmail();
        const magicLink = this.getLink(emailRes);
        if (magicLink) {
          console.log("Magic link found.");
          await this.authWithLink(magicLink);
          return magicLink;
        }
        if (attempt < maxAttempts) {
          console.log(`No email yet, waiting ${interval / 1e3} seconds...`);
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } catch (err) {
        console.log(`Attempt ${attempt} failed: ${err.message}`);
        if (attempt === maxAttempts) throw err;
      }
    }
    throw new Error("Magic link not received within timeout period.");
  }
  async init() {
    let hasAuthCookies = false;
    try {
      const cookies = await this.cookieJar.getCookies(this.baseURL);
      hasAuthCookies = cookies.some(c => c.key === "accessToken" || c.key === "refreshToken");
    } catch (e) {}
    if (!hasAuthCookies) {
      console.log("Starting initialization via email and magic link...");
      await this.makeEmail();
      await this.reqLink();
      await this.waitAndAuth();
      console.log("Initialization complete! Ready for image generation.");
    } else {
      console.log("API already authenticated (cookies found in jar).");
    }
    return true;
  }
  async imgUrlToBase64(imageUrl) {
    try {
      const res = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const base64 = Buffer.from(res.data, "binary").toString("base64");
      const contentType = res.headers["content-type"];
      return `data:${contentType};base64,${base64}`;
    } catch (err) {
      throw new Error(`Failed to convert image from URL to base64: ${err.message}`);
    }
  }
  async uploadImage(buffer, mimeType = "image/png") {
    try {
      const base64Image = buffer.toString("base64");
      const dataUri = `data:${mimeType};base64,${base64Image}`;
      const requestData = {
        file: dataUri
      };
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, requestData);
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
  async generate({
    imageUrl,
    type = "woman",
    mask = null
  }) {
    await this.init();
    try {
      let imgBase64Data;
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        imgBase64Data = await this.imgUrlToBase64(imageUrl);
      } else if (imageUrl.startsWith("data:")) {
        imgBase64Data = imageUrl;
      } else {
        throw new Error("Invalid image URL format. Must be a data URL or a remote HTTP/HTTPS URL.");
      }
      const reqData = {
        image: imgBase64Data,
        mask: mask,
        type: type.toUpperCase()
      };
      const res = await this.client.post(`${this.baseURL}/generation`, reqData);
      console.log("Generation request successful.");
      const base64Image = res.data;
      const buffer = Buffer.from(base64Image, "base64");
      const mimeType = "image/png";
      console.log("Uploading generated image...");
      const uploadResult = await this.uploadImage(buffer, mimeType);
      console.log(uploadResult);
      return uploadResult;
    } catch (err) {
      throw new Error(`Failed to generate or upload image: ${err.message}`);
    }
  }
  isAuth() {
    return !!this.cookieJar && this.cookieJar.getCookiesSync(this.baseURL).length > 0;
  }
  getEmailAddr() {
    return this.emailData ? this.emailData.email : null;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const api = new DeepNudesAPI();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}