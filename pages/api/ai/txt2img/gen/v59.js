import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import qs from "qs";
import * as cheerio from "cheerio";
import crypto from "crypto";
class AiHereClient {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://aihere.ru",
      jar: this.jar,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 15; RMX3890 Build/AQ3A.240812.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/143.0.7499.115 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "sec-ch-ua": '"Android WebView";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "upgrade-insecure-requests": "1",
        "x-requested-with": "com.stdio.aihere",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "navigate",
        "sec-fetch-dest": "document",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        priority: "u=0, i"
      }
    }));
    this.isLoggedIn = false;
    this.currentUser = this.generateUser();
  }
  log(message, type = "INFO") {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [AiHere] [${type}] ${message}`);
  }
  generateUser() {
    const randHex = crypto.randomBytes(4).toString("hex");
    return {
      email: `user_${randHex}@gmail.com`,
      password: `Pass_${randHex}!`
    };
  }
  async getCsrf(url) {
    try {
      this.log(`Fetching CSRF from ${url}...`);
      const res = await this.client.get(url);
      const html = res?.data || "";
      const $ = cheerio.load(html);
      const token = $('input[name="csrf_token"]').val();
      if (!token) throw new Error("CSRF Token not found");
      return token;
    } catch (error) {
      this.log(`Failed get CSRF: ${error.message}`, "ERROR");
      throw error;
    }
  }
  async register() {
    if (this.isLoggedIn) return;
    try {
      const registerUrl = "/register.php";
      const csrfToken = await this.getCsrf(registerUrl);
      const payload = {
        csrf_token: csrfToken,
        device_fingerprint: crypto.randomBytes(32).toString("hex"),
        email: this.currentUser.email,
        password: this.currentUser.password
      };
      this.log(`Registering user: ${this.currentUser.email}`);
      const res = await this.client.post(registerUrl, qs.stringify(payload), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          referer: "https://aihere.ru/register.php",
          origin: "https://aihere.ru"
        }
      });
      if (res.status === 200 || res.status === 302) {
        this.isLoggedIn = true;
        this.log("Registration success, session established.");
      }
    } catch (error) {
      this.log(`Register failed: ${error?.message}`, "ERROR");
      throw error;
    }
  }
  async pollTask(taskId) {
    const maxTime = 6e4;
    const interval = 3e3;
    const startTime = Date.now();
    this.log(`Starting polling for task: ${taskId}`);
    while (Date.now() - startTime < maxTime) {
      try {
        const res = await this.client.post("/api/check-order-status.php", {
          task_id: taskId
        }, {
          headers: {
            "Content-Type": "application/json",
            referer: `https://aihere.ru/order-detail.php?id=${taskId}`
          }
        });
        const data = res?.data;
        const status = data?.status || "unknown";
        this.log(`Poll status: ${status}`);
        if (status === "completed") {
          const taskInfo = data?.task || {};
          const resultUrl = taskInfo?.cloud_url || taskInfo?.result_url || null;
          return {
            result: resultUrl,
            ...taskInfo
          };
        } else if (status === "failed") {
          throw new Error(data?.task?.error_message || "Task failed unknown reason");
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        this.log(`Polling error: ${error.message}`, "WARN");
      }
    }
    throw new Error("Polling timeout (60s)");
  }
  async generate({
    prompt,
    ...rest
  }) {
    try {
      if (!this.isLoggedIn) await this.register();
      const targetUrl = "/minimax-image.php";
      const csrfToken = await this.getCsrf(targetUrl);
      const aspectRatio = rest?.aspect_ratio || "3:4";
      const postData = qs.stringify({
        csrf_token: csrfToken,
        mode: "text_to_image",
        prompt: prompt,
        aspect_ratio: aspectRatio
      });
      this.log(`Sending prompt: "${prompt}" [${aspectRatio}]`);
      const res = await this.client.post(targetUrl, postData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          referer: "https://aihere.ru/minimax-image.php",
          origin: "https://aihere.ru"
        }
      });
      const htmlResponse = res?.data || "";
      const match = htmlResponse.match(/order-detail\.php\?id=([a-zA-Z0-9_]+)/);
      if (!match || !match[1]) {
        if (htmlResponse.includes("Не хватает")) throw new Error("Insufficient balance");
        throw new Error("Failed to parse Task ID from response");
      }
      const taskId = match[1];
      this.log(`Task created successfully. ID: ${taskId}`);
      const finalResult = await this.pollTask(taskId);
      return finalResult;
    } catch (error) {
      this.log(`Chat process failed: ${error?.message}`, "ERROR");
      return {
        result: null,
        error: error?.message || "Unknown error",
        status: "error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AiHereClient();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}