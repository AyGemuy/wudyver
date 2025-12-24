import axios from "axios";
import CryptoJS from "crypto-js";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
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
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
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
    const maxAttempts = 60;
    const delay = 3e3;
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
  async create({
    url
  }) {
    let username, email, rawPassword, accessToken, wayinTaskId;
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
      wayinTaskId = startTaskRes.data.id;
      const task_id = await this.enc({
        wayinTaskId: wayinTaskId,
        accessToken: accessToken,
        username: username,
        email: email,
        rawPassword: rawPassword
      });
      console.log("Process: Task initiated successfully!");
      return {
        task_id: task_id
      };
    } catch (error) {
      console.error("Process: An error occurred during the automated process:", error.message);
      throw error;
    }
  }
  async status({
    task_id
  }) {
    try {
      if (!task_id) {
        throw new Error("task_id is required to check status.");
      }
      const decryptedData = await this.dec(task_id);
      const {
        wayinTaskId,
        accessToken
      } = decryptedData;
      if (!wayinTaskId || !accessToken) {
        throw new Error("Invalid task_id: Missing required data after decryption.");
      }
      console.log(`API Step: Polling task status (Wayin ID: ${wayinTaskId})...`);
      const pollTaskRes = await this.pollTask(wayinTaskId, accessToken);
      if (pollTaskRes.data.status === "DONE") {
        const resultListRes = await this.getResultList(wayinTaskId, accessToken);
        return {
          status: "success",
          result: pollTaskRes.data,
          list: resultListRes.data
        };
      } else {
        return {
          status: pollTaskRes.data.status,
          message: `Task is currently: ${pollTaskRes.data.status}.`
        };
      }
    } catch (error) {
      console.error("Error in WayinAPI status check:", error);
      throw new Error(`Failed to check Wayin task status: ${error.message}`);
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
      error: "Action (create or status) is required."
    });
  }
  const wayinApi = new WayinAPI();
  try {
    switch (action) {
      case "create":
        if (!params.url) {
          return res.status(400).json({
            error: "URL is required for 'create' action."
          });
        }
        const createResponse = await wayinApi.create(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await wayinApi.status(params);
        return res.status(200).json(statusResponse);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions are 'create' and 'status'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}