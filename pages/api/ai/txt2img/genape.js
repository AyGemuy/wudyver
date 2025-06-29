import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class GenapeAPI {
  constructor(baseURL = "https://api.genape.ai") {
    this.api = axios.create({
      baseURL: baseURL,
      headers: {
        accept: "application/json",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://app.genape.ai",
        priority: "u=1, i",
        referer: "https://app.genape.ai/",
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
  genUuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0,
        v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
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
      const parts = textContent.split("\n\n");
      const relevantPart = parts.pop();
      const match = relevantPart.trim().match(/^([a-zA-Z0-9]+)/);
      if (match && match[1]) return match[1];
      throw new Error("OTP not found in email content.");
    } catch (e) {
      console.error("Processing Error: getOtp failed:", e.message);
      throw e;
    }
  }
  async reqCode(mail, visitorId, type = "register", lang = "English") {
    try {
      const data = {
        mail: mail,
        type: type,
        visitor_id: visitorId,
        lang: lang
      };
      console.log("API Step: Requesting verification code from Genape...");
      const res = await this.api.post("/users/code", data);
      if (res.data.detail !== "Scusess!") throw new Error(`Code request failed: ${res.data.detail || "Unknown error"}`);
      return res.data;
    } catch (e) {
      console.error("API Error: reqCode failed:", e.message);
      throw e;
    }
  }
  async checkCode(mail, code) {
    try {
      const data = {
        mail: mail,
        code: code
      };
      console.log("API Step: Checking verification code...");
      const res = await this.api.post("/users/code/check", data);
      return res.data;
    } catch (e) {
      console.error("API Error: checkCode failed:", e.message);
      throw e;
    }
  }
  async registerUser(mail, password, visitorId, ipAddress = "182.1.199.114") {
    try {
      const data = {
        mail: mail,
        login_type: "password",
        user_password: password,
        real_name: mail,
        company_name: "",
        purpose: "",
        picture_url: "None",
        domain: "",
        user_source: "genape",
        referral_code: "",
        visitor_id: visitorId,
        lang: "id-ID",
        ip_address: ipAddress,
        device: "Android",
        agent: "Chrome v135.0.0.0"
      };
      console.log("API Step: Registering user...");
      const res = await this.api.post("/users", data);
      if (!res.data.access_token) throw new Error(`User registration failed or no access token received.`);
      return res.data;
    } catch (e) {
      console.error("API Error: registerUser failed:", e.message);
      throw e;
    }
  }
  async genImage(prompt, accessToken, n = 1, negativePrompt = "blurr", size = "768x1024", style = "movie") {
    try {
      const data = {
        task_name: "txt2img",
        prompt: prompt,
        n: String(n),
        negative_prompt: negativePrompt,
        size: size,
        is_public: true,
        ai_tool: "image_ape",
        style: style
      };
      console.log("API Step: Generating image...");
      const res = await this.api.post("/generate/image", data, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (res.data.error) throw new Error(`Image generation failed: ${res.data.error}`);
      return res.data;
    } catch (e) {
      console.error("API Error: genImage failed:", e.message);
      throw e;
    }
  }
  async generate({
    prompt,
    n = 1,
    negativePrompt = "blur",
    size = "768x1024",
    style = "movie"
  }) {
    let email = null;
    let otp = null;
    const visitorId = this.genUuid();
    const password = this.genRandPass();
    try {
      email = await this.genTempEmail();
      await this.reqCode(email, visitorId, "register", "English");
      const messages = await this.getMsgs(email);
      otp = this.getOtp(messages[0].text_content);
      await this.checkCode(email, otp);
      const registerRes = await this.registerUser(email, password, visitorId);
      const accessToken = registerRes.access_token;
      const genImageRes = await this.genImage(prompt, accessToken, n, negativePrompt, size, style);
      console.log("Process: Image generation completed successfully!");
      return genImageRes;
    } catch (error) {
      console.error("Process: An error occurred during the automated image generation:", error.message);
      throw error;
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
  const genape = new GenapeAPI();
  try {
    const data = await genape.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}