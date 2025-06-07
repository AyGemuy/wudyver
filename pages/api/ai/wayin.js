import axios from "axios";
import CryptoJS from "crypto-js";
import apiConfig from "@/configs/apiConfig";
class WayinAPI {
  constructor(baseURL = "https://wayinvideo-api.wayin.ai") {
    this.api = axios.create({
      baseURL: baseURL,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://v.wayin.ai",
        priority: "u=1, i",
        referer: "https://v.wayin.ai/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  b64(input, urlSafe = false) {
    try {
      const base64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(input));
      if (urlSafe) return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
      return base64;
    } catch (e) {
      console.error("Error in b64 encoding:", e.message);
      throw e;
    }
  }
  genTicket(reason, email, timestamp) {
    try {
      const dataToHash = reason + email + timestamp;
      return this.b64(CryptoJS.MD5(dataToHash).toString());
    } catch (e) {
      console.error("Error in genTicket:", e.message);
      throw e;
    }
  }
  async reqVCode(email, reason) {
    try {
      const timestamp = new Date().getTime();
      const ticket = this.genTicket(reason, email, timestamp);
      const data = {
        email: email,
        reason: reason,
        timestamp: timestamp,
        ticket: ticket
      };
      console.log("API Step: Requesting verification code...");
      const res = await this.api.post("/verify_code", data);
      if (res.data.code !== "0") throw new Error(`VCode request failed: ${res.data.message}`);
      return res.data;
    } catch (e) {
      console.error("API Error: reqVCode failed:", e.message);
      throw e;
    }
  }
  async genTempEmail() {
    try {
      console.log("API Step: Generating temporary email...");
      const res = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      return res.data.email;
    } catch (e) {
      console.error("API Error: genTempEmail failed:", e.message);
      throw e;
    }
  }
  async getMsgs(email) {
    let attempts = 0;
    const maxAttempts = 15;
    const delay = 5e3;
    while (attempts < maxAttempts) {
      try {
        console.log(`API Step: Fetching messages (attempt ${attempts + 1}/${maxAttempts})...`);
        const res = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        if (res.data.data && res.data.data.length > 0) return res.data.data;
      } catch (e) {
        console.error(`API Error: getMsgs attempt ${attempts + 1} failed:`, e.message);
      }
      await new Promise(r => setTimeout(r, delay));
      attempts++;
    }
    throw new Error("No messages received after multiple attempts.");
  }
  getOtp(textContent) {
    try {
      const match = textContent.match(/\b(\d+)\b/);
      if (match && match[1]) return match[1];
      throw new Error("OTP not found in email content.");
    } catch (e) {
      console.error("Processing Error: getOtp failed:", e.message);
      throw e;
    }
  }
  genRandUser(length = 8) {
    try {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let user = "user";
      for (let i = 0; i < length - 4; i++) user += chars.charAt(Math.floor(Math.random() * chars.length));
      return user;
    } catch (e) {
      console.error("Generation Error: genRandUser failed:", e.message);
      throw e;
    }
  }
  genRandPass(length = 14) {
    try {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
      let pass = "";
      for (let i = 0; i < length; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
      return pass;
    } catch (e) {
      console.error("Generation Error: genRandPass failed:", e.message);
      throw e;
    }
  }
  async doSignup(username, email, rawPassword, otp) {
    try {
      const hashedPassword = CryptoJS.MD5(rawPassword).toString();
      const data = {
        username: username,
        email: email,
        password: hashedPassword,
        verify_code: otp
      };
      console.log("API Step: Performing signup...");
      const res = await this.api.post("/signup", data);
      if (res.data.code !== "0") throw new Error(`Signup failed: ${res.data.message}`);
      return res.data;
    } catch (e) {
      console.error("API Error: doSignup failed:", e.message);
      throw e;
    }
  }
  async getVidMeta(videoUrl, accessToken) {
    try {
      console.log(`API Step: Fetching video metadata for ${videoUrl}...`);
      const res = await this.api.post("/api/p/v2/get_video_meta", {
        video_url: videoUrl
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (res.data.code !== "0") throw new Error(`Get video meta failed: ${res.data.message}`);
      return res.data;
    } catch (e) {
      console.error("API Error: getVidMeta failed:", e.message);
      throw e;
    }
  }
  async startTask(videoMeta, accessToken) {
    try {
      console.log("API Step: Starting highlight moment task...");
      const res = await this.api.post(`/api/highlight_moment/task/start?url_source=URL&ratio=RATIO_ORIGINAL`, videoMeta, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "disable-msg": "1"
        }
      });
      if (res.data.code !== "0") throw new Error(`Start task failed: ${res.data.message}`);
      return res.data;
    } catch (e) {
      console.error("API Error: startTask failed:", e.message);
      throw e;
    }
  }
  async pollTask(taskId, accessToken) {
    let attempts = 0;
    const maxAttempts = 60;
    const delay = 5e3;
    while (attempts < maxAttempts) {
      try {
        console.log(`API Step: Polling task status (ID: ${taskId}, attempt ${attempts + 1}/60)...`);
        const res = await this.api.get(`/api/highlight_moment/task?id=${taskId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "disable-msg": "1"
          }
        });
        if (res.data.code === "0" && res.data.data.status === "DONE") {
          console.log("API Step: Task is DONE!");
          return res.data;
        }
        if (res.data.data.status === "FAIL" || res.data.data.status === "ERROR") {
          throw new Error(`Task failed: ${res.data.data.error_code || "Unknown error"}`);
        }
      } catch (e) {
        console.error(`API Error: pollTask attempt ${attempts + 1} failed:`, e.message);
      }
      await new Promise(r => setTimeout(r, delay));
      attempts++;
    }
    throw new Error(`Task ${taskId} did not complete within 300 seconds.`);
  }
  async getResultList(taskId, accessToken) {
    try {
      console.log(`API Step: Fetching result list for task ID: ${taskId}...`);
      const res = await this.api.get(`/api/highlight_moment/list?task_id=${taskId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "disable-msg": "1"
        }
      });
      if (res.data.code !== "0") throw new Error(`Get result list failed: ${res.data.message}`);
      return res.data;
    } catch (e) {
      console.error("API Error: getResultList failed:", e.message);
      throw e;
    }
  }
  async generate({
    url
  }) {
    let username, email, rawPassword, accessToken, taskId;
    try {
      username = this.genRandUser();
      rawPassword = this.genRandPass();
      email = await this.genTempEmail();
      await this.reqVCode(email, "SIGNUP");
      const messages = await this.getMsgs(email);
      const otp = this.getOtp(messages[0].text_content);
      const signupRes = await this.doSignup(username, email, rawPassword, otp);
      accessToken = signupRes.data.bearer.access_token;
      const videoMetaRes = await this.getVidMeta(url, accessToken);
      const startTaskRes = await this.startTask(videoMetaRes.data, accessToken);
      taskId = startTaskRes.data.id;
      const pollTaskRes = await this.pollTask(taskId, accessToken);
      const resultListRes = await this.getResultList(taskId, accessToken);
      console.log("Process: All steps completed successfully!");
      return {
        result: pollTaskRes.data,
        list: resultListRes.data
      };
    } catch (error) {
      console.error("Process: An error occurred during the automated process:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const wayin = new WayinAPI();
    const response = await wayin.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}