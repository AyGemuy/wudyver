import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class DigenClient {
  constructor(options = {}) {
    this.baseUrl = "https://api.digen.ai/v1";
    this.mailApiUrl = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.videoApiUrl = "https://api.digen.ai/v3/video";
    this.defaultPassword = this.generateRandomPassword(12);
    this.defaultName = "";
    this.defaultLanguage = "id-ID";
    this.defaultPlatform = "web";
    this.defaultUserAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
    this.origin = "https://rm.digen.ai";
    this.referer = "https://rm.digen.ai/";
    this.email = null;
    this.token = null;
    this.sessionId = this.generateUUID();
    this.userId = null;
    this.registerToken = null;
    this.lastOTP = null;
    this.spoofIp = this.generateRandomIp();
    this.cookieJar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": this.defaultLanguage,
        "cache-control": "no-cache",
        "content-type": "application/json",
        pragma: "no-cache",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": this.defaultUserAgent,
        "digen-language": this.defaultLanguage,
        "digen-platform": this.defaultPlatform,
        origin: this.origin,
        referer: this.referer,
        ...SpoofHead()
      },
      jar: this.cookieJar,
      withCredentials: true
    }));
    Object.assign(this, options);
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
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  generateRandomIp() {
    const octet = () => Math.floor(Math.random() * 255) + 1;
    return `${octet()}.${octet()}.${octet()}.${octet()}`;
  }
  generateRandomPassword(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
  async createEmail() {
    try {
      console.log("LOG: Creating temporary email...");
      const response = await axios.get(`${this.mailApiUrl}?action=create`, {
        headers: {
          accept: "application/json",
          "X-Forwarded-For": this.generateRandomIp()
        }
      });
      const data = response.data;
      if (!data || !data.email) {
        throw new Error(`Failed to create email: No email received in response. Response: ${JSON.stringify(data)}`);
      }
      this.email = data.email;
      console.log(`LOG: Email created: ${this.email}`);
      return this.email;
    } catch (error) {
      console.error(`ERROR: Failed to create email: ${error.message}`);
      throw error;
    }
  }
  async checkOTP(maxRetries = 20, delay = 3e3) {
    console.log("LOG: Waiting for OTP...");
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(`${this.mailApiUrl}?action=message&email=${this.email}`, {
          headers: {
            accept: "application/json",
            "X-Forwarded-For": this.generateRandomIp()
          }
        });
        const data = response.data;
        if (data && data.data && data.data.length > 0) {
          const textContent = data.data[0].text_content;
          const otpMatch = textContent.match(/Verification code: (\d+)/);
          if (otpMatch) {
            this.lastOTP = otpMatch[1];
            console.log(`LOG: OTP received: ${this.lastOTP}`);
            return this.lastOTP;
          }
        }
      } catch (error) {
        console.warn(`LOG: OTP check attempt ${i + 1} failed: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error("Failed to retrieve OTP after maximum retries");
  }
  async sendVerificationCode() {
    this.sessionId = this.generateUUID();
    try {
      console.log("LOG: Sending verification code...");
      const response = await this.axiosInstance.post(`${this.baseUrl}/user/send_code`, {
        email: this.email
      }, {
        headers: {
          "digen-token": this.token || this.generateUUID(),
          "digen-sessionid": this.sessionId,
          "X-Forwarded-For": this.generateRandomIp()
        }
      });
      const data = response.data;
      if (!data || data.errCode !== 0) {
        throw new Error(`Send code failed: ${data ? data.errMsg : "No data received."} Response: ${JSON.stringify(data)}`);
      }
      console.log("LOG: Verification code sent successfully.");
      return data;
    } catch (error) {
      console.error(`ERROR: Failed to send verification code: ${error.message}`);
      throw error;
    }
  }
  async verifyCode(code) {
    this.sessionId = this.generateUUID();
    try {
      console.log("LOG: Verifying code...");
      const response = await this.axiosInstance.post(`${this.baseUrl}/user/verify_code`, {
        email: this.email,
        code: code
      }, {
        headers: {
          "digen-token": this.token || this.generateUUID(),
          "digen-sessionid": this.sessionId,
          "X-Forwarded-For": this.generateRandomIp()
        }
      });
      const data = response.data;
      if (!data || data.errCode !== 0) {
        throw new Error(`Verify code failed: ${data ? data.errMsg : "No data received."} Response: ${JSON.stringify(data)}`);
      }
      this.registerToken = data.data.register_token;
      console.log("LOG: Code verified successfully.");
      return data;
    } catch (error) {
      console.error(`ERROR: Failed to verify code: ${error.message}`);
      throw error;
    }
  }
  async register(password = null, name = null) {
    this.sessionId = this.generateUUID();
    const finalPassword = password || this.defaultPassword;
    const finalName = name || this.defaultName;
    try {
      console.log("LOG: Registering user...");
      const response = await this.axiosInstance.post(`${this.baseUrl}/user/register`, {
        email: this.email,
        register_token: this.registerToken,
        name: finalName,
        password: finalPassword,
        password2: finalPassword,
        code: this.lastOTP,
        invite_code: null
      }, {
        headers: {
          "digen-token": this.token || this.generateUUID(),
          "digen-sessionid": this.sessionId,
          "X-Forwarded-For": this.generateRandomIp()
        }
      });
      const data = response.data;
      if (!data || data.errCode !== 0) {
        throw new Error(`Register failed: ${data ? data.errMsg : "No data received."} Response: ${JSON.stringify(data)}`);
      }
      this.token = data.data.token;
      this.userId = data.data.id;
      console.log("LOG: Registration successful.");
      return data;
    } catch (error) {
      console.error(`ERROR: Failed to register: ${error.message}`);
      throw error;
    }
  }
  async getLoginReward() {
    this.sessionId = this.generateUUID();
    try {
      console.log("LOG: Getting login reward...");
      const response = await this.axiosInstance.post(`${this.baseUrl}/credit/reward?action=Login`, null, {
        headers: {
          "content-length": "0",
          "digen-token": this.token,
          "digen-sessionid": this.sessionId,
          "X-Forwarded-For": this.generateRandomIp()
        }
      });
      const data = response.data;
      if (!data || data.errCode !== 0) {
        throw new Error(`Get login reward failed: ${data ? data.errMsg : "No data received."} Response: ${JSON.stringify(data)}`);
      }
      console.log("LOG: Login reward claimed.");
      return data;
    } catch (error) {
      console.error(`ERROR: Failed to get login reward: ${error.message}`);
      throw error;
    }
  }
  async authenticate() {
    console.log("LOG: Starting authentication process...");
    try {
      await this.createEmail();
      await this.sendVerificationCode();
      this.lastOTP = await this.checkOTP();
      if (!this.lastOTP) {
        throw new Error("OTP not received, cannot proceed with verification.");
      }
      await this.verifyCode(this.lastOTP);
      if (!this.registerToken) {
        throw new Error("Register token not obtained after verification.");
      }
      await this.register();
      if (!this.token) {
        throw new Error("Authentication token not obtained after registration.");
      }
      await this.getLoginReward();
      console.log("LOG: Authentication completed successfully!");
      return {
        email: this.email,
        token: this.token,
        userId: this.userId,
        sessionId: this.sessionId
      };
    } catch (error) {
      console.error("ERROR: Authentication process error:", error.message);
      throw error;
    }
  }
  async getPresignedUploadUrl(format = "jpeg") {
    this.sessionId = this.generateUUID();
    try {
      console.log(`LOG: Getting presigned URL for format: ${format}...`);
      const response = await this.axiosInstance.get(`${this.baseUrl}/element/priv/presign?format=${format}`, {
        headers: {
          "digen-token": this.token,
          "digen-sessionid": this.sessionId,
          "X-Forwarded-For": this.generateRandomIp()
        }
      });
      const data = response.data;
      if (!data || data.errCode !== 0 || !data.data || !data.data.url) {
        throw new Error(`Presign failed: ${data ? data.errMsg : "No data received or invalid format."} Response: ${JSON.stringify(data)}`);
      }
      console.log("LOG: Presigned URL obtained.");
      return data.data.url;
    } catch (error) {
      console.error(`ERROR: Failed to get presigned upload URL: ${error.message}`);
      throw error;
    }
  }
  async uploadImageToS3(uploadUrl, imageData, contentType) {
    try {
      console.log(`LOG: Uploading image to S3 with content type: ${contentType}...`);
      await axios.put(uploadUrl, imageData, {
        headers: {
          "Content-Type": contentType,
          Accept: "application/json, text/plain, */*",
          Connection: "keep-alive",
          "Cache-Control": "no-cache",
          Origin: this.origin,
          Pragma: "no-cache",
          Referer: this.referer,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
          "User-Agent": this.defaultUserAgent,
          "X-Forwarded-For": this.generateRandomIp()
        }
      });
      console.log("LOG: Image uploaded to S3.");
    } catch (error) {
      console.error(`ERROR: Failed to upload image to S3: ${error.message}`);
      throw error;
    }
  }
  async syncImage(url, fileName, thumbnail = null) {
    this.sessionId = this.generateUUID();
    try {
      console.log(`LOG: Syncing image with Digen AI: ${fileName}...`);
      const response = await this.axiosInstance.post(`${this.baseUrl}/element/priv/sync`, {
        url: url,
        thumbnail: thumbnail || url,
        fileName: fileName
      }, {
        headers: {
          "digen-token": this.token,
          "digen-sessionid": this.sessionId,
          "X-Forwarded-For": this.generateRandomIp()
        }
      });
      const data = response.data;
      if (!data || data.errCode !== 0) {
        throw new Error(`Sync image failed: ${data ? data.errMsg : "No data received."} Response: ${JSON.stringify(data)}`);
      }
      console.log("LOG: Image synced successfully.");
      return data;
    } catch (error) {
      console.error(`ERROR: Failed to sync image: ${error.message}`);
      throw error;
    }
  }
  async uploadImage(imageUrl, fileName = null, contentType = null) {
    try {
      console.log(`LOG: Downloading image from URL: ${imageUrl}...`);
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageData = Buffer.from(imageResponse.data);
      const detectedContentType = imageResponse.headers["content-type"] || contentType;
      if (!detectedContentType) {
        throw new Error("Could not determine content type of the image from URL. Please provide it manually.");
      }
      console.log(`LOG: Detected content type: ${detectedContentType}`);
      const format = detectedContentType.split("/")[1];
      if (!format) {
        throw new Error("Could not determine image format from content type.");
      }
      console.log(`LOG: Detected format: ${format}`);
      const finalFileName = fileName || `uploaded_image.${format}`;
      console.log(`LOG: Using filename: ${finalFileName}`);
      const uploadUrl = await this.getPresignedUploadUrl(format);
      const baseUrlForSync = uploadUrl.split("?")[0];
      await this.uploadImageToS3(uploadUrl, imageData, detectedContentType);
      await this.syncImage(baseUrlForSync, finalFileName);
      console.log("LOG: Image upload and sync completed.");
      return baseUrlForSync;
    } catch (error) {
      console.error(`ERROR: Image upload and sync failed from URL: ${error.message}`);
      throw error;
    }
  }
  async enhance({
    imageUrl,
    prompt
  }) {
    if (!this.token) {
      console.log("INFO: Not authenticated. Running authentication process first.");
      await this.authenticate();
    }
    this.sessionId = this.generateUUID();
    try {
      console.log(`LOG: Enhancing prompt for image: ${imageUrl} with prompt: "${prompt}"...`);
      const response = await this.axiosInstance.post(`${this.baseUrl}/tools/enhance_prompt`, {
        url: imageUrl,
        prompt: prompt
      }, {
        headers: {
          "digen-token": this.token,
          "digen-sessionid": this.sessionId,
          "X-Forwarded-For": this.generateRandomIp()
        }
      });
      const data = response.data;
      if (!data || data.errCode !== 0) {
        throw new Error(`Enhance prompt failed: ${data ? data.errMsg : "No data received."} Response: ${JSON.stringify(data)}`);
      }
      console.log("LOG: Prompt enhanced successfully.");
      return data;
    } catch (error) {
      console.error(`ERROR: Failed to enhance prompt: ${error.message}`);
      throw error;
    }
  }
  async txt2img({
    image_size = "536x960",
    width = 536,
    height = 960,
    lora_id = "",
    prompt = "A man with short dark hair, wearing a black jacket over a plaid shirt, is captured mid-flight against a backdrop of tall trees and dappled sunlight. His expression is serious, and he appears to be gliding gracefully through the air. The camera follows him smoothly, creating a sense of motion and freedom. The scene is set in a serene forest, with soft shadows and natural light highlighting his silhouette.",
    batch_size = 4,
    strength = "0.9",
    ...rest
  }) {
    if (!this.token) {
      console.log("INFO: Not authenticated. Running authentication process first.");
      await this.authenticate();
    }
    this.sessionId = this.generateUUID();
    try {
      console.log(`LOG: Generating image with prompt: "${prompt}"...`);
      const response = await this.axiosInstance.post(`https://api.digen.ai/v2/tools/text_to_image`, {
        image_size: image_size,
        width: width,
        height: height,
        lora_id: lora_id,
        prompt: prompt,
        batch_size: batch_size,
        strength: strength,
        ...rest
      }, {
        headers: {
          "digen-token": this.token,
          "digen-sessionid": this.sessionId,
          "X-Forwarded-For": this.generateRandomIp()
        }
      });
      const data = response.data;
      if (!data || data.errCode !== 0 || !data.data || !data.data.id) {
        throw new Error(`Text to image generation failed: ${data ? data.errMsg : "Invalid response structure or missing ID."} Response: ${JSON.stringify(data)}`);
      }
      console.log(data);
      console.log(`LOG: Image generation submitted. Task ID: ${data.data.id}`);
      const textToEncrypt = {
        task_id: data.data.id,
        type: "txt2img",
        sessionId: this.sessionId,
        token: this.token
      };
      const encrypted_task_id = await this.enc(textToEncrypt);
      return {
        status: true,
        task_id: encrypted_task_id
      };
    } catch (error) {
      console.error(`ERROR: Failed to generate image from text: ${error.message}`);
      throw error;
    }
  }
  async txt2vid({
    imageUrl: imageUrlToUpload = "https://digen-asset.s3.us-west-1.amazonaws.com/image/1180206_1753158414637514615_a5be34e8-d346-458f-a480-33070fe281db.jpeg",
    prompt = "There is a subject in the video. digen050 gentleman time, the subject puts on a dark blue suit jacket, adjusts the shoulder area, pulls it over the arm, smooths the jacket, and then places both hands into the pockets. The facial expression remains neutral throughout, with a subtle smile and relaxed eyes., digen050.",
    audioUrl = "https://digen-asset.s3.us-west-1.amazonaws.com/audio/En-326.MP3",
    sceneId = "9",
    model = "lora",
    loraId = "77",
    ratio = "portrait",
    seconds = "5",
    strength = "1.0",
    engine = "turbo",
    audio = "2",
    lipsync = "2",
    ...rest
  }) {
    if (!this.token) {
      console.log("INFO: Not authenticated. Running authentication process first.");
      await this.authenticate();
    }
    let url;
    if (imageUrlToUpload) {
      url = await this.uploadImage(imageUrlToUpload);
    }
    this.sessionId = this.generateUUID();
    const scene_params = {
      thumbnail: url,
      image_url: url,
      last_image_url: "",
      video_gen_prompt: prompt,
      labelID: "",
      audio_url: audioUrl,
      is_add_background_audio: audio,
      background_audio_url: "",
      lipsync: lipsync,
      aspect_ratio: ratio,
      seconds: seconds,
      replicate_jobId: "",
      lora_id: loraId,
      tags: {
        modelName: "LORA"
      },
      strength: strength,
      engine: engine,
      code: `${Date.now()}_${this.generateUUID()}`,
      ...rest
    };
    try {
      console.log("LOG: Submitting video generation job...");
      const response = await this.axiosInstance.post(`${this.baseUrl}/scene/job/submit`, {
        uuid: this.generateUUID(),
        taskType: "task",
        taskStatus: "queued",
        createdTime: Date.now(),
        scene_id: sceneId,
        model: model,
        scene_params: JSON.stringify(scene_params),
        thumbnail: url,
        image_url: url,
        last_image_url: "",
        video_gen_prompt: prompt,
        labelID: "",
        audio_url: audioUrl,
        is_add_background_audio: audio,
        background_audio_url: "",
        lipsync: lipsync,
        aspect_ratio: ratio,
        seconds: seconds,
        replicate_jobId: "",
        lora_id: loraId,
        tags: {
          modelName: "LORA"
        },
        strength: strength,
        engine: engine,
        submitting: true,
        ...rest
      }, {
        headers: {
          "digen-token": this.token,
          "digen-sessionid": this.sessionId,
          "X-Forwarded-For": this.generateRandomIp()
        }
      });
      const data = response.data;
      if (!data || data.errCode !== 0 || !data.data || !data.data.jobId) {
        throw new Error(`Video generation submission failed: ${data ? data.errMsg : "Invalid response structure or missing jobId."} Response: ${JSON.stringify(data)}`);
      }
      console.log(data);
      console.log(`LOG: Video generation submitted. Job ID: ${data.data.jobId}`);
      const textToEncrypt = {
        task_id: data.data.jobId,
        type: "txt2vid",
        sessionId: this.sessionId,
        token: this.token
      };
      const encrypted_task_id = await this.enc(textToEncrypt);
      return {
        status: true,
        task_id: encrypted_task_id
      };
    } catch (error) {
      console.error(`ERROR: Failed to generate video: ${error.message}`);
      throw error;
    }
  }
  async status({
    task_id
  }) {
    let decryptedData;
    let taskType;
    try {
      const json = await this.dec(task_id);
      if (!json) throw new Error("Failed to decrypt task_id (empty result).");
      decryptedData = json;
      this.sessionId = decryptedData.sessionId;
      this.token = decryptedData.token;
      taskType = decryptedData.type;
    } catch (decryptError) {
      console.error(`ERROR: Failed to decrypt task_id: ${decryptError.message}`);
      throw new Error(`Invalid or corrupt task_id provided: ${decryptError.message}`);
    }
    try {
      console.log(`LOG: Checking status for original job ID: ${decryptedData.task_id} of type ${taskType}...`);
      let response;
      const commonHeaders = {
        "digen-token": this.token,
        "digen-sessionid": this.sessionId,
        "X-Forwarded-For": this.generateRandomIp()
      };
      if (taskType === "txt2vid") {
        response = await this.axiosInstance.get(`${this.videoApiUrl}/job/list_by_job_id?job_id=${decryptedData.task_id}`, {
          headers: commonHeaders
        });
      } else if (taskType === "txt2img") {
        response = await this.axiosInstance.post(`https://api.digen.ai/v6/video/get_task_v2`, {
          jobID: decryptedData.task_id
        }, {
          headers: commonHeaders
        });
      } else {
        throw new Error(`Unknown task type: ${taskType}`);
      }
      const data = response.data;
      if (!data || data.errCode !== 0) {
        throw new Error(`Failed to get job status: ${data ? data.errMsg : "No data received."} Response: ${JSON.stringify(data)}`);
      }
      console.log(data);
      console.log(`LOG: Status for job ${decryptedData.task_id} retrieved.`);
      return data;
    } catch (error) {
      console.error(`ERROR: Failed to check ${taskType} status: ${error.message}`);
      throw error;
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
      error: "Missing required field: action",
      required: {
        action: "txt2vid | txt2img | enhance | status"
      }
    });
  }
  const client = new DigenClient();
  try {
    let result;
    switch (action) {
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required fields for 'txt2vid': prompt`
          });
        }
        result = await client.txt2vid(params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field for 'txt2img': prompt`
          });
        }
        result = await client.txt2img(params);
        break;
      case "enhance":
        if (!params.imageUrl || !params.prompt) {
          return res.status(400).json({
            error: `Missing required fields for 'enhance': imageUrl, prompt`
          });
        }
        result = await client.enhance(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required field for 'status': task_id`
          });
        }
        result = await client.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed actions are: txt2vid, txt2img, enhance, status.`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`API Error for action ${action}:`, error.message);
    return res.status(500).json({
      error: `Processing error for action '${action}': ${error.message}`
    });
  }
}