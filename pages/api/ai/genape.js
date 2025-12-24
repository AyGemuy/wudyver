import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
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
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.token = null;
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
      this.token = res.data.access_token;
      return res.data;
    } catch (e) {
      console.error("API Error: registerUser failed:", e.message);
      throw e;
    }
  }
  async imageUrlToBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const base64 = Buffer.from(response.data, "binary").toString("base64");
      return base64;
    } catch (error) {
      console.error("Error converting image to base64:", error.message);
      throw error;
    }
  }
  async uploadImage(payload, accessToken) {
    try {
      console.log("API Step: Uploading image...");
      const res = await this.api.post("/generate/upload-image", payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (res.data.error) throw new Error(`Image upload failed: ${res.data.error}`);
      return res.data;
    } catch (e) {
      console.error("API Error: uploadImage failed:", e.message);
      throw e;
    }
  }
  async generateVideo(payload, accessToken) {
    try {
      console.log("API Step: Generating video...");
      const res = await this.api.post("/generate-video", payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (res.data.error) throw new Error(`Video generation failed: ${res.data.error}`);
      return res.data;
    } catch (e) {
      console.error("API Error: generateVideo failed:", e.message);
      throw e;
    }
  }
  async getVideoStatus(payload, accessToken) {
    try {
      console.log("API Step: Getting video status...");
      const res = await this.api.post("/generate-video/log", payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return res.data;
    } catch (e) {
      console.error("API Error: getVideoStatus failed:", e.message);
      throw e;
    }
  }
  async img2vid(params) {
    const {
      imageUrl,
      prompt,
      generate_target = "pyramid",
      additional_settings = {},
      image_format = "WEBP",
      used_template = "video",
      ...rest
    } = params;
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
      const base64Image = await this.imageUrlToBase64(imageUrl);
      const uploadPayload = {
        image_format: image_format,
        base_64_image: base64Image,
        used_template: used_template,
        ...rest.uploadSettings
      };
      const uploadRes = await this.uploadImage(uploadPayload, accessToken);
      const uploadedImageUrl = uploadRes.url || uploadRes.image_url;
      const defaultSettings = {
        style: "movie",
        duration: 3,
        aspect_ratio: "3:5",
        generate_mode: "Turbo",
        motion_mode: false
      };
      const videoPayload = {
        prompt: prompt,
        generate_target: generate_target,
        user_image_url: uploadedImageUrl,
        additional_settings: {
          ...defaultSettings,
          ...additional_settings
        },
        ...rest.videoSettings
      };
      const videoRes = await this.generateVideo(videoPayload, accessToken);
      console.log("Process: Video generation started successfully!");
      const textToEncrypt = {
        token: accessToken
      };
      const encrypted_task_id = await this.enc(textToEncrypt);
      return {
        status: true,
        task_id: encrypted_task_id,
        video_data: videoRes
      };
    } catch (error) {
      console.error("Process: An error occurred during img2vid:", error.message);
      throw error;
    }
  }
  async status(params) {
    const {
      task_id,
      statusSettings = {},
      ...rest
    } = params;
    let decryptedData;
    try {
      const json = await this.dec(task_id);
      if (!json) throw new Error("Failed to decrypt task_id (empty result).");
      decryptedData = json;
      this.token = decryptedData.token;
      const statusPayload = {
        exclude_list: [],
        ...statusSettings,
        ...rest
      };
      const statusRes = await this.getVideoStatus(statusPayload, this.token);
      console.log("Process: Status check completed successfully!");
      return statusRes;
    } catch (error) {
      console.error("Process: An error occurred during status check:", error.message);
      throw error;
    }
  }
  async genImage(params, accessToken) {
    const {
      prompt,
      n = 1,
      negative_prompt = "blurr",
      size = "768x1024",
      style = "movie",
      task_name = "txt2img",
      is_public = true,
      ai_tool = "image_ape",
      ...rest
    } = params;
    try {
      const data = {
        task_name: task_name,
        prompt: prompt,
        n: String(n),
        negative_prompt: negative_prompt,
        size: size,
        is_public: is_public,
        ai_tool: ai_tool,
        style: style,
        ...rest
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
  async txt2img(params) {
    const {
      prompt,
      n = 1,
      negativePrompt = "blur",
      size = "768x1024",
      style = "movie",
      ...rest
    } = params;
    let email = null;
    let otp = null;
    const visitorId = this.genUuid();
    const password = this.genRandPass();
    try {
      email = await this.genTempEmail();
      await this.reqCode(email, visitorId, "register", "English");
      const messages = await this.getMsgs(email);
      otp = this.getOtp(messages[0]?.text_content);
      await this.checkCode(email, otp);
      const registerRes = await this.registerUser(email, password, visitorId);
      const accessToken = registerRes.access_token;
      const imageParams = {
        prompt: prompt,
        n: n,
        negative_prompt: negativePrompt,
        size: size,
        style: style,
        ...rest
      };
      const genImageRes = await this.genImage(imageParams, accessToken);
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
  const {
    action
  } = params;
  if (!action) {
    return res.status(400).json({
      error: "action parameter is required",
      available_actions: ["txt2img", "img2vid", "status"]
    });
  }
  const genape = new GenapeAPI();
  try {
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "prompt is required for txt2img action"
          });
        }
        console.log("Handler: Processing txt2img action...");
        const txtResult = await genape.txt2img(params);
        return res.status(200).json(txtResult);
      case "img2vid":
        if (!params.imageUrl || !params.prompt) {
          return res.status(400).json({
            error: "imageUrl and prompt are required for img2vid action"
          });
        }
        console.log("Handler: Processing img2vid action...");
        const vidResult = await genape.img2vid(params);
        return res.status(200).json(vidResult);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status action"
          });
        }
        console.log("Handler: Processing status action...");
        const statusResult = await genape.status(params);
        return res.status(200).json(statusResult);
      default:
        return res.status(400).json({
          error: `Unknown action: ${action}`,
          available_actions: ["txt2img", "img2vid", "status"]
        });
    }
  } catch (error) {
    console.error(`Handler Error for action ${action}:`, error.message);
    return res.status(500).json({
      action: action,
      success: false,
      error: `Error during ${action} request`,
      message: error.message
    });
  }
}