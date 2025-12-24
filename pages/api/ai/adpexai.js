import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class AdpexAIClient {
  constructor() {
    this.baseMailUrl = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.baseAdpexUrl = "https://api.adpexai.com/api";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      language: "en",
      origin: "https://www.adpexai.com",
      priority: "u=1, i",
      referer: "https://www.adpexai.com/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-fbp": "x-fbp",
      ...SpoofHead()
    };
    this.token = null;
    this.userId = null;
    this.userEmail = null;
    this.userPassword = btoa("IniAdalahContohPasswordKuat123");
    this.isAuthenticated = false;
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
  async ensureAuth() {
    try {
      if (this.isAuthenticated) {
        console.log("[Auth] Already authenticated");
        return;
      }
      if (!this.userEmail) {
        console.log("[Auth] Creating temp email...");
        this.userEmail = await this.createTempEmail();
        console.log(`[Auth] Using temp email: ${this.userEmail}`);
      }
      if (!this.userId) {
        console.log("[Auth] Registering account...");
        const registerResponse = await this.register(this.userEmail, this.userPassword);
        this.userId = registerResponse?.data?.userId;
        this.codeId = registerResponse?.data?.codeId;
        if (!this.userId || !this.codeId) {
          throw new Error("Registration failed - missing user ID or code ID");
        }
        console.log("[Auth] Checking for OTP...");
        const otp = await this.checkOTP(this.userEmail);
        await this.verifyAccount(this.userEmail, this.userId, this.codeId, otp);
      }
      if (!this.token) {
        console.log("[Auth] Logging in...");
        await this.login(this.userEmail, this.userPassword);
      }
      this.isAuthenticated = true;
      console.log("[Auth] Authentication complete");
    } catch (error) {
      console.error("[Auth] Error during authentication:", error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
  async createTempEmail() {
    try {
      console.log("[TempMail] Creating temporary email...");
      const response = await axios.get(`${this.baseMailUrl}?action=create`);
      const email = response?.data?.email;
      if (!email) throw new Error("No email in response");
      console.log("[TempMail] Created email:", email);
      return email;
    } catch (error) {
      console.error("[TempMail] Error creating email:", error.message);
      throw error;
    }
  }
  async checkOTP(email, maxAttempts = 60, delay = 3e3) {
    try {
      console.log(`[OTP] Checking for OTP in ${email}...`);
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`[OTP] Attempt ${attempt}/${maxAttempts}`);
          const response = await axios.get(`${this.baseMailUrl}?action=message&email=${email}`);
          const textContent = response?.data?.data?.[0]?.text_content;
          if (!textContent) {
            console.log("[OTP] No text content found in response");
            continue;
          }
          const otpMatch = textContent.match(/Verification Code\r\n(\d+)/);
          if (otpMatch?.[1]) {
            console.log("[OTP] Found OTP:", otpMatch[1]);
            return otpMatch[1];
          }
          console.log("[OTP] OTP not found in email content");
        } catch (error) {
          console.error(`[OTP] Attempt ${attempt} failed:`, error.message);
        }
        if (attempt < maxAttempts) {
          console.log(`[OTP] Waiting ${delay / 1e3} seconds before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      throw new Error("OTP not found after maximum attempts");
    } catch (error) {
      console.error("[OTP] Error checking OTP:", error.message);
      throw error;
    }
  }
  async register(email, password) {
    try {
      console.log("[Register] Registering account...");
      const response = await axios.post(`${this.baseAdpexUrl}/user/v1/user/register`, {
        userEmail: email,
        userPassword: password,
        userTenantId: 1
      }, {
        headers: this.headers
      });
      console.log("[Register] Registration response:", response?.data);
      return response?.data;
    } catch (error) {
      console.error("[Register] Error registering:", error.message);
      if (error.response) {
        console.error("[Register] Response data:", error.response.data);
      }
      throw error;
    }
  }
  async verifyAccount(email, userId, codeId, otp) {
    try {
      console.log("[Verify] Verifying account...");
      const response = await axios.post(`${this.baseAdpexUrl}/user/v1/user/register/active`, {
        userId: userId,
        codeId: codeId,
        time: new Date().toISOString(),
        userEmail: email,
        verificationCode: otp
      }, {
        headers: this.headers
      });
      console.log("[Verify] Verification response:", response?.data);
      return response?.data;
    } catch (error) {
      console.error("[Verify] Error verifying account:", error.message);
      if (error.response) {
        console.error("[Verify] Response data:", error.response.data);
      }
      throw error;
    }
  }
  async login(email, password) {
    try {
      console.log("[Login] Logging in...");
      const response = await axios.post(`${this.baseAdpexUrl}/user/v1/user/login`, {
        userEmail: email,
        userPassword: password
      }, {
        headers: this.headers
      });
      this.token = response?.data?.data?.userToken;
      if (!this.token) throw new Error("No token in response");
      this.headers["ad-pex-token"] = this.token;
      console.log("[Login] Login successful");
      return response?.data;
    } catch (error) {
      console.error("[Login] Error logging in:", error.message);
      if (error.response) {
        console.error("[Login] Response data:", error.response.data);
      }
      throw error;
    }
  }
  async downloadImage(imageUrl) {
    try {
      console.log("[Download] Downloading image from URL:", imageUrl);
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      if (!response?.data) throw new Error("No image data received");
      console.log("[Download] Image downloaded successfully");
      return {
        data: response.data,
        type: response.headers?.["content-type"] || "image/jpeg",
        size: parseInt(response.headers?.["content-length"] || "0"),
        name: imageUrl.split("/").pop()?.split("?")[0] || "image.jpg"
      };
    } catch (error) {
      console.error("[Download] Error downloading image:", error.message);
      throw error;
    }
  }
  async uploadImageFromUrl(imageUrl) {
    try {
      await this.ensureAuth();
      console.log("[Upload] Starting upload from URL:", imageUrl);
      const imageData = await this.downloadImage(imageUrl);
      console.log("[Upload] Image info:", {
        name: imageData.name,
        type: imageData.type,
        size: imageData.size
      });
      console.log("[Upload] Getting presigned URL...");
      const presignedResponse = await axios.post(`${this.baseAdpexUrl}/user/v1/s3/presigned/url`, {
        fileDirectoryUrl: "adpex/ai/effect",
        fileName: imageData.name,
        isSaveOriginalName: false
      }, {
        headers: this.headers
      });
      const s3PresignedUrl = presignedResponse?.data?.data?.s3PresignedUrl;
      const s3CloudUrl = presignedResponse?.data?.data?.s3CloudUrl;
      if (!s3PresignedUrl || !s3CloudUrl) {
        throw new Error("Missing presigned URL or cloud URL in response");
      }
      console.log("[Upload] Uploading to S3...");
      await axios.put(s3PresignedUrl, imageData.data, {
        headers: {
          "Content-Type": imageData.type,
          "Content-Length": imageData.size
        }
      });
      console.log("[Upload] Saving file info...");
      const saveResponse = await axios.post(`${this.baseAdpexUrl}/user/v1/s3/saveFile`, {
        fileName: imageData.name,
        s3CloudUrl: s3CloudUrl
      }, {
        headers: this.headers
      });
      const fileId = saveResponse?.data?.data?.fileId;
      const fileUrl = saveResponse?.data?.data?.fileS3CloudUrlFull;
      if (!fileId || !fileUrl) {
        throw new Error("Missing file ID or URL in save response");
      }
      console.log("[Upload] Upload complete:", {
        fileId: fileId,
        fileUrl: fileUrl
      });
      return {
        fileId: fileId,
        fileUrl: fileUrl,
        ...saveResponse?.data?.data
      };
    } catch (error) {
      console.error("[Upload] Error uploading image:", error.message);
      throw error;
    }
  }
  async img2vid({
    imageUrl,
    ...rest
  }) {
    try {
      await this.ensureAuth();
      console.log("[Img2Vid] Starting image to video conversion...");
      const {
        fileId,
        fileUrl
      } = await this.uploadImageFromUrl(imageUrl);
      console.log("[Img2Vid] Using file:", {
        fileId: fileId,
        fileUrl: fileUrl
      });
      const payload = {
        agentRoute: "ghibli-ai-video-generator",
        edit: JSON.stringify({
          imgurl: fileUrl,
          fileId: fileId,
          ...rest
        }),
        param: {
          imgurl: fileUrl,
          fileId: fileId,
          ...rest
        },
        type: "AI Effect his"
      };
      console.log("[Img2Vid] Sending request with payload:", payload);
      const response = await axios.post(`${this.baseAdpexUrl}/user/v2/aiEffect/image`, payload, {
        headers: this.headers
      });
      const taskId = response?.data?.data;
      if (!taskId) throw new Error("No task ID in response");
      console.log("[Img2Vid] Conversion started, task ID:", taskId);
      const task_id = await this.enc({
        taskId: taskId,
        token: this.token,
        userId: this.userId,
        userEmail: this.userEmail,
        isAuthenticated: true
      });
      return {
        task_id: task_id
      };
    } catch (error) {
      console.error("[Img2Vid] Error:", error.message);
      throw error;
    }
  }
  async status({
    task_id,
    ...rest
  }) {
    try {
      if (!task_id) {
        throw new Error("task_id is required to check status.");
      }
      const decryptedData = await this.dec(task_id);
      const {
        taskId,
        token,
        userId,
        userEmail,
        isAuthenticated
      } = decryptedData;
      if (!taskId) {
        throw new Error("Invalid task_id: Missing taskId after decryption.");
      }
      this.token = token;
      this.userId = userId;
      this.userEmail = userEmail;
      this.isAuthenticated = isAuthenticated;
      this.headers["ad-pex-token"] = token;
      await this.ensureAuth();
      console.log("[TaskStatus] Checking status for task:", taskId);
      const payload = {
        allTaskIds: [taskId],
        ...rest
      };
      const response = await axios.post(`${this.baseAdpexUrl}/user/v2/allTask/list`, payload, {
        headers: this.headers
      });
      console.log("[TaskStatus] Response:", response?.data);
      return response?.data;
    } catch (error) {
      console.error("[TaskStatus] Error:", error.message);
      throw error;
    }
  }
  async prompt_enhance({
    prompt,
    ...rest
  }) {
    try {
      await this.ensureAuth();
      console.log("[Prompt] Enhancing prompt:", prompt);
      const payload = {
        prompt: prompt,
        ...rest
      };
      const response = await axios.post(`${this.baseAdpexUrl}/user/v2/aiEffect/promptEnhance`, payload, {
        headers: this.headers
      });
      console.log("[Prompt] Enhanced response:", response?.data);
      return response?.data;
    } catch (error) {
      console.error("[Prompt] Error:", error.message);
      throw error;
    }
  }
  async txt2img({
    prompt,
    resolution = "1024x1536",
    model = "gpt-image-1",
    ...rest
  }) {
    try {
      await this.ensureAuth();
      console.log("[Txt2Img] Generating image from text:", prompt);
      const payload = {
        agentRoute: model,
        edit: JSON.stringify({
          prompt: prompt,
          resolution: resolution,
          totalimages: "1",
          model: model,
          ...rest
        }),
        param: {
          prompt: prompt,
          resolution: resolution,
          totalimages: "1",
          model: model,
          ...rest
        },
        number: 1,
        type: "AI Image his"
      };
      const response = await axios.post(`${this.baseAdpexUrl}/user/v2/aiHub/saveTask`, payload, {
        headers: this.headers
      });
      console.log("[Txt2Img] Generation result:", response?.data);
      const taskId = response?.data?.data;
      if (!taskId) throw new Error("No task ID in response");
      console.log("[Img2Vid] Conversion started, task ID:", taskId);
      const task_id = await this.enc({
        taskId: taskId,
        token: this.token,
        userId: this.userId,
        userEmail: this.userEmail,
        isAuthenticated: true
      });
      return {
        task_id: task_id
      };
    } catch (error) {
      console.error("[Txt2Img] Error:", error.message);
      throw error;
    }
  }
  async img2img({
    imageUrl,
    fileId,
    ratio = "1",
    model = "cg-art-style",
    ...rest
  }) {
    try {
      await this.ensureAuth();
      console.log("[Img2Img] Starting image transformation...");
      const uploadedImage = fileId ? {
        fileId: fileId
      } : await this.uploadImageFromUrl(imageUrl);
      console.log("[Img2Img] Using file:", uploadedImage);
      const payload = {
        agentRoute: model,
        edit: JSON.stringify({
          imgurl: uploadedImage.fileUrl || imageUrl,
          ratio: ratio,
          fileId: uploadedImage.fileId,
          ...rest
        }),
        param: {
          imgurl: uploadedImage.fileUrl || imageUrl,
          ratio: ratio,
          fileId: uploadedImage.fileId,
          ...rest
        },
        type: "AI Effect his"
      };
      const response = await axios.post(`${this.baseAdpexUrl}/user/v2/aiEffect/image`, payload, {
        headers: this.headers
      });
      console.log("[Img2Img] Transformation result:", response?.data);
      const taskId = response?.data?.data;
      if (!taskId) throw new Error("No task ID in response");
      console.log("[Img2Vid] Conversion started, task ID:", taskId);
      const task_id = await this.enc({
        taskId: taskId,
        token: this.token,
        userId: this.userId,
        userEmail: this.userEmail,
        isAuthenticated: true
      });
      return {
        task_id: task_id
      };
    } catch (error) {
      console.error("[Img2Img] Error:", error.message);
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
      error: "Action is required."
    });
  }
  const client = new AdpexAIClient();
  try {
    let response;
    switch (action) {
      case "img2vid":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "imageUrl are required for img2vid."
          });
        }
        const img2vid_task_id = await client.img2vid(params);
        return res.status(200).json(img2vid_task_id);
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "imageUrl are required for img2img."
          });
        }
        const img2img_task_id = await client.img2img(params);
        return res.status(200).json(img2img_task_id);
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2img."
          });
        }
        const txt2img_task_id = await client.txt2img(params);
        return res.status(200).json(txt2img_task_id);
      case "prompt_enhance":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for prompt_enhance."
          });
        }
        const prompt_enhance_task_id = await client.prompt_enhance(params);
        return res.status(200).json(prompt_enhance_task_id);
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
          error: `Invalid action: ${action}. Supported actions are 'img2vid', 'img2img', 'txt2img', 'prompt_enhance', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}