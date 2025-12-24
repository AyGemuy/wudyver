import axios from "axios";
import {
  FormData
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class PiclumenAPI {
  constructor() {
    this.cookies = "";
    this.axiosInstance = axios.create({
      baseURL: "https://api.piclumen.com/api",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        platform: "Web",
        origin: "https://piclumen.com",
        referer: "https://piclumen.com/",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    });
    this.axiosInstance.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        const newCookies = setCookieHeader.map(cookieStr => {
          const parts = cookieStr.split(";");
          return parts[0];
        }).join("; ");
        this.cookies = newCookies;
      }
      return response;
    }, error => {
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.request.use(config => {
      if (this.cookies) {
        config.headers["Cookie"] = this.cookies;
      }
      return config;
    }, error => {
      return Promise.reject(error);
    });
    this.tempMailAPI = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`
    });
  }
  async createTempEmail() {
    console.log("Creating temporary email...");
    try {
      const response = await this.tempMailAPI.get("?action=create");
      if (response.data && response.data.email) {
        console.log(`Temporary email created: ${response.data.email}`);
        return response.data.email;
      } else {
        throw new Error("Failed to create temporary email: Invalid response");
      }
    } catch (error) {
      console.error("Error creating temporary email:", error.message);
      throw error;
    }
  }
  async checkEmailOTP(email) {
    console.log(`Checking OTP for email: ${email}...`);
    let otp = null;
    const maxAttempts = 60;
    let attempts = 0;
    while (otp === null && attempts < maxAttempts) {
      try {
        const response = await this.tempMailAPI.get(`?action=message&email=${email}`);
        if (response.data && response.data.data && response.data.data.length > 0) {
          const latestEmail = response.data.data[0];
          const textContent = latestEmail.text_content;
          const otpMatch = textContent.match(/\b\d{4}\b/);
          if (otpMatch) {
            otp = otpMatch[0];
            console.log(`OTP found: ${otp}`);
            return otp;
          }
        }
        console.log(`OTP not found yet. Retrying in 5 seconds... (Attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 3e3));
        attempts++;
      } catch (error) {
        console.error(`Error checking OTP for ${email}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 3e3));
        attempts++;
      }
    }
    throw new Error(`Failed to retrieve OTP for ${email} after ${maxAttempts} attempts.`);
  }
  async sendRegistrationCode(email) {
    console.log(`Sending registration code to ${email}...`);
    try {
      const formData = new FormData();
      formData.append("account", email);
      const response = await this.axiosInstance.post("/user/register-send-code", formData, {
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData._boundary}`
        }
      });
      if (response.data.status === 0) {
        console.log("Registration code sent successfully.");
        return response.data;
      } else {
        throw new Error(`Failed to send registration code: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`Error sending registration code to ${email}:`, error.message);
      throw error;
    }
  }
  async register(email, password, validateCode) {
    console.log(`Registering user ${email}...`);
    try {
      const response = await this.axiosInstance.post("/user/register", {
        account: email,
        password: password,
        validateCode: validateCode
      }, {
        headers: {
          "Content-Type": "application/json;charset=UTF-8"
        }
      });
      if (response.data.status === 0) {
        console.log("User registered successfully.");
        return response.data;
      } else {
        throw new Error(`Failed to register user: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`Error registering user ${email}:`, error.message);
      throw error;
    }
  }
  async login(email, password) {
    console.log(`Logging in user ${email}...`);
    try {
      const formData = new FormData();
      formData.append("account", email);
      formData.append("password", password);
      const response = await this.axiosInstance.post("/user/login", formData, {
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData._boundary}`
        }
      });
      if (response.data.status === 0 && response.data.data && response.data.data.token) {
        console.log("Login successful. Token obtained.");
        return response.data.data.token;
      } else {
        throw new Error(`Login failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`Error logging in user ${email}:`, error.message);
      throw error;
    }
  }
  async receiveTaskReward(token) {
    console.log("Receiving task reward...");
    try {
      const response = await this.axiosInstance.post("/lumen-task/receive-task-reward", ["1"], {
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          Authorization: token
        }
      });
      if (response.data.status === 0) {
        console.log("Task reward received successfully.");
        return response.data;
      } else {
        throw new Error(`Failed to receive task reward: ${response.data.message}`);
      }
    } catch (error) {
      console.error("Error receiving task reward:", error.message);
      throw error;
    }
  }
  async createGenerationTask(prompt, token, {
    highPixels = false,
    model_id = "34ec1b5a-8962-4a93-b047-68cec9691dc2",
    negative_prompt = "NSFW, watermark",
    resolution = {
      width: 832,
      height: 1216,
      batch_size: 1
    },
    seed = Math.floor(Math.random() * 1e11),
    steps = 25,
    cfg = 4.5,
    sampler_name = "dpmpp_2m_sde_gpu",
    scheduler = "karras",
    ponyTags = {},
    denoise = 1,
    hires_fix_denoise = .5,
    hires_scale = 2,
    multi_img2img_info = {
      style_list: []
    },
    img_control_info = {
      style_list: []
    },
    continueCreate = false
  } = {}) {
    console.log(`Creating image generation task for prompt: "${prompt}"...`);
    try {
      const payload = {
        highPixels: highPixels,
        model_id: model_id,
        prompt: prompt,
        negative_prompt: negative_prompt,
        resolution: resolution,
        model_ability: {
          anime_style_control: null
        },
        seed: seed,
        steps: steps,
        cfg: cfg,
        sampler_name: sampler_name,
        scheduler: scheduler,
        ponyTags: ponyTags,
        denoise: denoise,
        hires_fix_denoise: hires_fix_denoise,
        hires_scale: hires_scale,
        multi_img2img_info: multi_img2img_info,
        img_control_info: img_control_info,
        continueCreate: continueCreate
      };
      const response = await this.axiosInstance.post("/gen/create", payload, {
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          Authorization: token
        }
      });
      if (response.data.status === 0 && response.data.data && response.data.data.markId) {
        console.log(`Image generation task created with markId: ${response.data.data.markId}`);
        return response.data.data.markId;
      } else {
        throw new Error(`Failed to create generation task: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`Error creating generation task for "${prompt}":`, error.message);
      throw error;
    }
  }
  async getGeneratedImage(markId, token) {
    console.log(`Fetching generated image for markId: ${markId}...`);
    let imageUrl = null;
    const maxAttempts = 60;
    let attempts = 0;
    while (imageUrl === null && attempts < maxAttempts) {
      try {
        const response = await this.axiosInstance.post("/task/batch-process-task", [markId], {
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
            Authorization: token
          }
        });
        if (response.data.status === 0 && response.data.data && response.data.data.length > 0) {
          const taskResult = response.data.data[0];
          if (taskResult.status === "success" && taskResult.img_urls && taskResult.img_urls.length > 0) {
            imageUrl = taskResult.img_urls[0].imgUrl;
            console.log(`Generated image URL: ${imageUrl}`);
            return response.data;
          } else if (taskResult.status === "processing") {
            console.log(`Image generation still processing. Retrying in 5 seconds... (Attempt ${attempts + 1}/${maxAttempts})`);
          } else {
            throw new Error(`Image generation failed with status: ${taskResult.status}`);
          }
        } else {
          console.log(`No image data yet. Retrying in 5 seconds... (Attempt ${attempts + 1}/${maxAttempts})`);
        }
        await new Promise(resolve => setTimeout(resolve, 3e3));
        attempts++;
      } catch (error) {
        console.error(`Error fetching generated image for markId ${markId}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 3e3));
        attempts++;
      }
    }
    throw new Error(`Failed to retrieve generated image for markId ${markId} after ${maxAttempts} attempts.`);
  }
  async generate({
    prompt = "men",
    ...rest
  }) {
    let email = "";
    let password = "";
    let otp = "";
    let authToken = "";
    let markId = "";
    let imageUrl = "";
    try {
      email = await this.createTempEmail();
      password = email.split("@")[0];
      await this.sendRegistrationCode(email);
      otp = await this.checkEmailOTP(email);
      await this.register(email, password, otp);
      authToken = await this.login(email, password);
      await this.receiveTaskReward(authToken);
      markId = await this.createGenerationTask(prompt, authToken, rest);
      imageUrl = await this.getGeneratedImage(markId, authToken);
      return {
        email: email,
        token: authToken,
        ...imageUrl
      };
    } catch (error) {
      console.error("Generation process failed:", error.message);
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
  const generator = new PiclumenAPI();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}