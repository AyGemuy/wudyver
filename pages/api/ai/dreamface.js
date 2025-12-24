import axios from "axios";
import https from "https";
import {
  randomBytes,
  createHash
} from "crypto";
import FormData from "form-data";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class DreamFace {
  constructor() {
    const httpsAgent = new https.Agent({
      keepAlive: true,
      maxSockets: 100,
      timeout: 6e4
    });
    this.api = axios.create({
      baseURL: "https://tools.dreamfaceapp.com/dw-server",
      headers: {
        "client-id": "354ca12f042677e272e987a2304f7784",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/5.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/5.36",
        accept: "application/json",
        origin: "https://tools.dreamfaceapp.com",
        referer: "https://tools.dreamfaceapp.com/tools/ai-image",
        ...SpoofHead()
      },
      httpsAgent: httpsAgent,
      timeout: 6e4
    });
    this.credentials = {};
    console.log("DreamFace client initialized with increased HTTPS timeout.");
  }
  _rand(len = 8) {
    return randomBytes(len).toString("hex");
  }
  async _req(config) {
    try {
      console.log(`\n---\n[REQUEST] -> ${config.method?.toUpperCase() || "GET"} ${config.url}`);
      const response = await this.api(config);
      console.log(`[RESPONSE DATA] <- ${config.url}`);
      console.log(JSON.stringify(response.data, null, 2));
      if (response.data?.status_code === "THS12140000000" || config.url.includes("check_subscribe") && response.data?.status === 0) {
        return response.data.data ?? response.data;
      }
      throw new Error(`API Error: ${response.data?.status_msg || "Success condition not met."}`);
    } catch (error) {
      console.error(`Request Failed for ${config.url}:`, error.response?.data || error.message);
      throw error;
    }
  }
  async _initSession() {
    console.log("Initializing user session and attempting to claim free credits...");
    const accountPayload = {
      platform_type: "MOBILE",
      tenant_name: "dream_face",
      account_id: this.credentials.accountId,
      user_id: this.credentials.userId
    };
    await this._req({
      url: "/sys_config/query/pay_source",
      method: "GET"
    });
    await this._req({
      url: "/rights/check_animate_free_today",
      method: "POST",
      data: {
        ...accountPayload,
        play_types: ["TEXT_TO_IMAGE_GPT"]
      },
      headers: {
        "content-type": "application/json"
      }
    });
    await this._req({
      url: "/notification/get_unread",
      method: "POST",
      data: accountPayload,
      headers: {
        "content-type": "application/json"
      }
    });
    await this._req({
      url: "/rights/get_free_rights",
      method: "POST",
      data: accountPayload,
      headers: {
        "content-type": "application/json"
      }
    });
    await this._req({
      url: "/user/save_user_login",
      method: "POST",
      data: {
        ...accountPayload,
        device_system: "PC-Mobile",
        device_name: "PC-Mobile",
        app_version: "4.7.1",
        time_zone: 8
      },
      headers: {
        "content-type": "application/json"
      }
    });
    const creditsData = await this._req({
      url: "/credits/get_remaining_credits",
      method: "POST",
      data: {
        ...accountPayload,
        time_zone: "Asia/Jakarta"
      },
      headers: {
        "content-type": "application/json"
      }
    });
    this.credentials.credits = creditsData;
    console.log(`Credit check completed. Free credits: ${creditsData?.free_count || 0}`);
  }
  async _login() {
    console.log("Attempting to log in and create a new account...");
    const email = `${this._rand(12)}@mail.com`;
    const password = this._rand(8);
    const initialUserId = createHash("md5").update(this._rand(16)).digest("hex");
    const payload = {
      password: password,
      user_id: initialUserId,
      third_id: email,
      third_platform: "EMAIL",
      third_ext: {
        email: email
      },
      register_source: "seo",
      platform_type: "MOBILE",
      tenant_name: "dream_face"
    };
    const loginData = await this._req({
      url: "/user/login",
      method: "POST",
      data: payload,
      headers: {
        "content-type": "application/json"
      }
    });
    const {
      token,
      account_id: accountId,
      user_id: userId
    } = loginData;
    if (!token || !accountId || !userId) throw new Error("Login failed: Missing token or user IDs.");
    this.credentials = {
      token: token,
      userId: userId,
      accountId: accountId,
      email: email
    };
    this.api.defaults.headers.common["token"] = token;
    console.log(`Login successful. Account ID: ${accountId}`);
    await this._initSession();
  }
  async _upload(image) {
    let imageBuffer;
    const fileName = `${this._rand(12)}.png`;
    if (Buffer.isBuffer(image)) {
      console.log(`Processing image from Buffer...`);
      imageBuffer = image;
    } else if (typeof image === "string" && image.startsWith("http")) {
      console.log(`Processing image from URL: ${image}`);
      const response = await axios.get(image, {
        responseType: "arraybuffer"
      });
      imageBuffer = response.data;
    } else if (typeof image === "string") {
      console.log(`Processing image from Base64 string...`);
      imageBuffer = Buffer.from(image, "base64");
    } else {
      throw new Error("Unsupported image type. Please provide a Buffer, URL, or Base64 string.");
    }
    const form = new FormData();
    form.append("file", imageBuffer, {
      filename: fileName,
      contentType: "image/png"
    });
    const uploadData = await this._req({
      url: `/phone_file/upload_for_step_image?user_id=${this.credentials.userId}`,
      method: "POST",
      data: form,
      headers: {
        ...form.getHeaders()
      }
    });
    const filePath = uploadData?.file_path;
    if (!filePath) throw new Error("Image upload failed.");
    console.log(`Upload successful. Server path: ${filePath}`);
    return filePath;
  }
  async _poll(taskId) {
    console.log(`Polling for task result with ID: ${taskId}`);
    const maxAttempts = 30;
    for (let attempts = 1; attempts <= maxAttempts; attempts++) {
      await delay(5e3);
      console.log(`[Attempt ${attempts}/${maxAttempts}] Checking task status...`);
      try {
        const pollData = await this._req({
          url: "/work_session/list",
          method: "POST",
          data: {
            user_id: this.credentials.userId,
            account_id: this.credentials.accountId,
            page: 1,
            size: 10,
            session_type: "AI_IMAGE",
            platform_type: "MOBILE",
            tenant_name: "dream_face"
          },
          headers: {
            "content-type": "application/json"
          }
        });
        const task = pollData?.list?.find(item => item.work_details?.[0]?.animate_id === taskId);
        const workDetails = task?.work_details?.[0];
        if (workDetails) {
          const workStatus = workDetails.work_status;
          if (workStatus === 200) {
            console.log("Task completed successfully!");
            return task;
          }
          if (workStatus === -1 || task?.session_status === -1) {
            console.error(`Task ${taskId} failed on the server.`);
            const errorMessage = workDetails.work_msg || `Generation task failed with server status: ${workStatus}.`;
            throw new Error(errorMessage);
          }
        }
      } catch (pollError) {
        console.error(`An error occurred during polling attempt ${attempts}:`, pollError.message);
        if (pollError.message.includes("failed with server status")) {
          throw pollError;
        }
      }
    }
    throw new Error(`Task polling timed out for task ID: ${taskId}.`);
  }
  async _waitForCredits(maxAttempts = 10, interval = 3e4) {
    for (let i = 1; i <= maxAttempts; i++) {
      await this._initSession();
      const credits = this.credentials.credits?.free_count ?? 0;
      if (credits > 0) {
        console.log(`Credits available: ${credits}. Proceeding with generation.`);
        return;
      }
      if (i < maxAttempts) {
        console.log(`Attempt ${i}/${maxAttempts}: No free credits. Waiting for ${interval / 1e3}s before retrying...`);
        await delay(interval);
      }
    }
    throw new Error("Account has no free credits after multiple attempts. Aborting.");
  }
  async generate({
    prompt,
    imageUrl,
    model,
    ratio,
    ...rest
  }) {
    if (!this.credentials.token) await this._login();
    await this._waitForCredits();
    console.log(`Starting generation...`);
    const isImg2Img = !!imageUrl;
    let photoInfoList = [{
      photo_path: ""
    }];
    if (isImg2Img) {
      const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      const uploadedUrls = [];
      for (const url of urls) {
        const uploadedPath = await this._upload(url);
        uploadedUrls.push(uploadedPath);
      }
      photoInfoList = uploadedUrls.map(path => ({
        photo_path: path
      }));
    }
    const type = isImg2Img ? "image2image" : "text2image";
    const finalModel = model || (isImg2Img ? "gemini" : "flux");
    const finalRatio = ratio || (isImg2Img ? "1:1" : "4:3");
    console.log(`Mode: ${type}, Model: ${finalModel}, Ratio: ${finalRatio}, Prompt: "${prompt}"`);
    const payload = {
      create_work_session: true,
      app_version: "4.7.1",
      work_type: "AI_IMAGE",
      template_id: isImg2Img ? "ai-image-gemini" : "ai-image",
      timestamp: Date.now(),
      play_types: [isImg2Img ? "IMAGE_TO_IMAGE_GEMINI" : "TEXT_TO_IMAGE"],
      user_id: this.credentials.userId,
      account_id: this.credentials.accountId,
      ext: {
        sing_title: prompt.substring(0, 10)
      },
      photo_info_list: photoInfoList,
      ai_gen_image_info: {
        type: type,
        width: 1024,
        height: 768,
        prompts: [{
          content: prompt,
          type: "text"
        }],
        model: finalModel,
        quality: "low",
        ratio: finalRatio,
        ...rest
      },
      platform_type: "MOBILE",
      tenant_name: "dream_face"
    };
    const generationData = await this._req({
      url: "/face/animate_image_web",
      method: "POST",
      data: payload,
      headers: {
        "content-type": "application/json"
      }
    });
    const taskId = generationData?.animate_image_id;
    if (taskId) return await this._poll(taskId);
    throw new Error("Failed to create generation task.");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const client = new DreamFace();
    const response = await client.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}