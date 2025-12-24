import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class AxiosClient {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://sisif.ai",
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "id-ID,id;q=0.9",
        "Sec-CH-UA": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "Sec-CH-UA-Mobile": "?1",
        "Sec-CH-UA-Platform": '"Android"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        ...SpoofHead()
      }
    }));
    this.csrfToken = null;
    this.setupInterceptors();
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
  setupInterceptors() {
    this.client.interceptors.request.use(config => {
      this.log(`🚀 Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    }, error => {
      this.log("❌ Request Error:", error.message);
      return Promise.reject(error);
    });
    this.client.interceptors.response.use(response => {
      this.log(`✅ Response: ${response.status} ${response.config.url}`);
      this.extractCsrfToken(response);
      return response;
    }, error => {
      this.log(`❌ Response Error: ${error.response?.status || "Network"} ${error.config?.url}`);
      return Promise.reject(error);
    });
  }
  extractCsrfToken(response) {
    try {
      const cookies = this.cookieJar.getCookiesSync("https://sisif.ai");
      const csrfCookie = cookies.find(cookie => cookie.key === "csrftoken" || cookie.key === "csrfmiddlewaretoken");
      if (csrfCookie) {
        this.csrfToken = csrfCookie.value;
        this.log("🔐 CSRF Token extracted:", this.csrfToken);
      }
      if (response.data && typeof response.data === "string") {
        const csrfMatch = response.data.match(/csrfmiddlewaretoken['"]?\s*[:=]\s*['"]([^'"]+)['"]/i);
        if (csrfMatch && csrfMatch[1]) {
          this.csrfToken = csrfMatch[1];
          this.log("🔐 CSRF Token from HTML:", this.csrfToken);
        }
      }
    } catch (error) {
      this.log("⚠️  Error extracting CSRF token:", error.message);
    }
  }
  generateRandomEmail() {
    const uuid = () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : r & 3 | 8;
        return v.toString(16);
      });
    };
    const email = `${uuid()}@emailhook.site`;
    this.log("📧 Generated email:", email);
    return email;
  }
  generateRandomPassword() {
    const length = 10;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    this.log("🔑 Generated password length:", password.length);
    return password;
  }
  parseLibraryResponse(html) {
    this.log("📝 Parsing library response...");
    const $ = cheerio.load(html);
    const videos = [];
    $(".grid > div").each((index, element) => {
      const $video = $(element);
      const video = {};
      const statusElement = $video.find(".bg-yellow-100, .bg-black");
      if (statusElement.length) {
        video.status = statusElement.text().trim();
      }
      const promptElement = $video.find(".text-gray-700.dark\\:text-gray-300");
      if (promptElement.length) {
        video.prompt = promptElement.text().trim();
      }
      const detailsElement = $video.find(".flex.items-center.space-x-1");
      if (detailsElement.length) {
        video.details = detailsElement.text().trim().replace(/\s+/g, " ");
      }
      const checkboxElement = $video.find("input.public-checkbox");
      if (checkboxElement.length) {
        const id = checkboxElement.attr("id")?.replace("public-", "");
        if (id) video.id = id;
      }
      const videoElement = $video.find("video source");
      if (videoElement.length) {
        video.completed = true;
        video.videoUrl = videoElement.attr("src");
      } else {
        video.completed = false;
        video.videoUrl = null;
      }
      if (Object.keys(video).length > 0) {
        videos.push(video);
      }
    });
    this.log(`📊 Parsed ${videos.length} videos`);
    return videos;
  }
  async getCookiesAsString() {
    try {
      const cookies = this.cookieJar.getCookiesSync("https://sisif.ai");
      return cookies.map(cookie => `${cookie.key}=${cookie.value}`).join("; ");
    } catch (error) {
      this.log("⚠️  Error getting cookies:", error.message);
      return "";
    }
  }
  async setCookiesFromString(cookieString) {
    try {
      if (cookieString) {
        const cookies = cookieString.split(";").map(c => c.trim());
        for (const cookie of cookies) {
          await this.cookieJar.setCookie(cookie, "https://sisif.ai");
        }
        this.log("🍪 Cookies set from string");
      }
    } catch (error) {
      this.log("⚠️  Error setting cookies:", error.message);
    }
  }
  async create({
    prompt,
    duration = "5",
    resolution = "180x320"
  }) {
    try {
      this.log("🎬 Starting video creation process...");
      this.log("📝 Prompt:", prompt);
      this.log("⏱️  Duration:", duration);
      this.log("📐 Resolution:", resolution);
      this.log("🔄 Step 1: Getting signup page...");
      await this.client.get("/accounts/signup/");
      this.log("🔄 Step 2: Creating account...");
      const email = this.generateRandomEmail();
      const password = this.generateRandomPassword();
      const signupData = new URLSearchParams();
      signupData.append("csrfmiddlewaretoken", this.csrfToken);
      signupData.append("email", email);
      signupData.append("password1", password);
      signupData.append("terms_agreement", "on");
      await this.client.post("/accounts/signup/", signupData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: "https://sisif.ai",
          Referer: "https://sisif.ai/accounts/signup/"
        }
      });
      this.log("🔄 Step 3: Accessing main page...");
      await this.client.get("/");
      this.log("🔄 Step 4: Accessing app page...");
      await this.client.get("/app/");
      this.log("🔄 Step 5: Creating video...");
      const createData = new URLSearchParams();
      createData.append("csrfmiddlewaretoken", this.csrfToken);
      createData.append("prompt", prompt);
      createData.append("duration", duration);
      createData.append("resolution", resolution);
      await this.client.post("/app/library/", createData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: "https://sisif.ai",
          Referer: "https://sisif.ai/app/"
        }
      });
      this.log("🔄 Step 6: Checking video creation result...");
      const libraryResponse = await this.client.get("/app/library/");
      const videos = this.parseLibraryResponse(libraryResponse.data);
      const cookieString = await this.getCookiesAsString();
      const result = {
        status: libraryResponse.status,
        cookies: cookieString,
        csrf: this.csrfToken,
        data: {
          email: email,
          password: password,
          videos: videos
        }
      };
      const task_id = await this.enc(result);
      this.log("✅ Video creation completed successfully!");
      return {
        task_id: task_id
      };
    } catch (error) {
      this.log("❌ Error in create method:", error.message);
      const cookieString = await this.getCookiesAsString();
      throw {
        status: error.response?.status,
        message: error.message,
        cookies: cookieString,
        csrf: this.csrfToken
      };
    }
  }
  async status({
    task_id
  }) {
    try {
      this.log("📊 Checking video status...");
      if (!task_id) {
        throw new Error("task_id is required to check status.");
      }
      const decryptedData = await this.dec(task_id);
      const {
        cookies,
        csrf
      } = decryptedData;
      this.csrfToken = csrf;
      if (!cookies) {
        throw new Error("Invalid task_id: Missing cookies after decryption.");
      }
      if (cookies) {
        this.log("🍪 Setting cookies from parameter...");
        await this.setCookiesFromString(cookies);
      }
      this.log("🔄 Fetching library page...");
      const response = await this.client.get("/app/library/");
      const videos = this.parseLibraryResponse(response.data);
      const cookieString = await this.getCookiesAsString();
      const result = {
        status: response.status,
        cookies: cookieString,
        csrf: this.csrfToken,
        data: {
          videos: videos
        }
      };
      this.log("✅ Status check completed successfully!");
      return result;
    } catch (error) {
      this.log("❌ Error in status method:", error.message);
      const cookieString = await this.getCookiesAsString();
      throw {
        status: error.response?.status,
        message: error.message,
        cookies: cookieString,
        csrf: this.csrfToken
      };
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
      error: "Action is required."
    });
  }
  const client = new AxiosClient();
  try {
    let response;
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for create."
          });
        }
        const txt2vid_task = await client.create(params);
        return res.status(200).json(txt2vid_task);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await client.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'create', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}