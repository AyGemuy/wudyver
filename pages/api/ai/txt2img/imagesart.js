import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import apiConfig from "@/configs/apiConfig";
class ImagesArtAiClient {
  constructor() {
    this.emailBase = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.authBase = "https://imagesart.ai/api/auth";
    this.apiBase = "https://imagesart.ai/api";
    this.tempEmail = null;
    this.tempEmailUuid = null;
    this.sessionToken = null;
    this.userEmail = null;
    this.userPass = null;
    const cookieJar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      jar: cookieJar,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://imagesart.ai",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        priority: "u=1, i",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      },
      timeout: 3e4
    }));
    this.axiosInstance.interceptors.response.use(response => response, error => {
      if (error.response) {
        console.error(`INTERCEPTOR ERROR: Request failed with status ${error.response.status}. Response Data:`, error.response.data);
        if (error.response.status === 401) {
          console.error("Authentication failed (401). Session token might be expired or invalid.");
        } else if (error.response.status === 400) {
          console.error("Bad Request (400). Check request payload/parameters carefully.");
        }
      } else if (error.request) {
        console.error("INTERCEPTOR ERROR: No response received:", error.request);
      } else {
        console.error("INTERCEPTOR ERROR: Error setting up request:", error.message);
      }
      return Promise.reject(error);
    });
  }
  async createMail() {
    try {
      console.log("START: Creating temporary email...");
      const res = await this.axiosInstance.get(`${this.emailBase}?action=create`);
      this.tempEmail = res.data.email;
      this.tempEmailUuid = res.data.uuid;
      console.log(`SUCCESS: Email created: ${this.tempEmail}`);
      return res.data;
    } catch (error) {
      console.error("ERROR: Failed to create email.", error.message);
      throw new Error(`Failed to create email: ${error.response?.data?.msg || error.message}`);
    }
  }
  async getMail(email = this.tempEmail) {
    if (!email) {
      throw new Error("Email address required to get messages. Call createMail() first or provide an email.");
    }
    try {
      console.log(`START: Getting messages for ${email}...`);
      const res = await this.axiosInstance.get(`${this.emailBase}?action=message&email=${email}`);
      console.log(`SUCCESS: Messages retrieved for ${email}`);
      return res.data;
    } catch (error) {
      console.error(`ERROR: Failed to get messages for ${email}.`, error.message);
      throw new Error(`Failed to get messages for ${email}: ${error.response?.data?.msg || error.message}`);
    }
  }
  async signUp(email, pass, name) {
    this.userEmail = email;
    this.userPass = pass;
    try {
      console.log(`START: Signing up user ${email}...`);
      const res = await this.axiosInstance.post(`${this.authBase}/sign-up/email`, {
        email: email,
        password: pass,
        name: name,
        callbackURL: "/"
      }, {
        headers: {
          referer: "https://imagesart.ai/auth/signup"
        }
      });
      this.sessionToken = res.data.token;
      console.log(`SUCCESS: Signed up user ${email}. Token status: ${this.sessionToken ? "received" : "null"}`);
      return res.data;
    } catch (error) {
      if (error.response?.data?.code === "USER_ALREADY_EXISTS") {
        console.warn("WARN: User already exists. Attempting to sign in...");
        return this.signIn(email, pass);
      }
      console.error(`ERROR: Failed to sign up ${email}.`, error.message);
      throw new Error(`Failed to sign up: ${error.response?.data?.message || error.message}`);
    }
  }
  async signIn(email, pass) {
    this.userEmail = email;
    this.userPass = pass;
    try {
      console.log(`START: Signing in user ${email}...`);
      const res = await this.axiosInstance.post(`${this.authBase}/sign-in/email`, {
        mode: "password",
        email: email,
        password: pass,
        callbackURL: "/"
      }, {
        headers: {
          referer: "https://imagesart.ai/auth/login"
        }
      });
      this.sessionToken = res.data.token;
      console.log(`SUCCESS: Signed in user ${email}. Token status: ${this.sessionToken ? "received" : "null"}`);
      return res.data;
    } catch (error) {
      console.error(`ERROR: Failed to sign in ${email}.`, error.message);
      throw new Error(`Failed to sign in: ${error.response?.data?.message || error.message}`);
    }
  }
  async verifyMail(link) {
    if (!link) {
      throw new Error("Verification link is required.");
    }
    try {
      console.log("START: Verifying email...");
      await axios.get(link);
      console.log("SUCCESS: Email verification initiated/completed.");
      return {
        success: true,
        message: "Email verification initiated/completed."
      };
    } catch (error) {
      console.error("ERROR: Failed to verify email.", error.message);
      throw new Error(`Failed to verify email: ${error.message}`);
    }
  }
  async ensureAuth() {
    const cookies = await this.axiosInstance.defaults.jar.getCookies("https://imagesart.ai");
    const sessionCookie = cookies.find(cookie => cookie.key === "__Secure-better-auth.session_token");
    if (!sessionCookie || !sessionCookie.value) {
      console.log("INFO: Session cookie not found or invalid. Starting authentication flow...");
      if (!this.tempEmail) {
        await this.createMail();
      }
      const authRes = await this.signUp(this.tempEmail, this.tempEmail, this.tempEmail);
      if (authRes.user && !authRes.user.emailVerified) {
        console.log("INFO: Email not verified. Polling for verification link...");
        let verifyLink = null;
        let attempts = 0;
        const maxAttempts = 60;
        const pollingInterval = 3e3;
        while (!verifyLink && attempts < maxAttempts) {
          console.log(`INFO: Attempt ${attempts + 1}/${maxAttempts} to get email messages...`);
          await new Promise(resolve => setTimeout(resolve, pollingInterval));
          const messages = await this.getMail(this.tempEmail);
          if (messages.data && messages.data.length > 0) {
            const verifyMsg = messages.data.find(msg => msg.headers.subject && msg.headers.subject[0].includes("Verify your email"));
            if (verifyMsg && verifyMsg.html_content) {
              const linkMatch = verifyMsg.html_content.match(/href="(https:\/\/imagesart\.ai\/api\/auth\/verify-email\?token=[^&]+&amp;callbackURL=\/)"/);
              if (linkMatch && linkMatch[1]) {
                verifyLink = linkMatch[1].replace(/&amp;/g, "&");
              }
            }
          }
          attempts++;
        }
        if (verifyLink) {
          await this.verifyMail(verifyLink);
          await this.signIn(this.userEmail, this.userPass);
        } else {
          throw new Error("Failed to find email verification link after multiple attempts.");
        }
      } else {
        console.log("INFO: User already verified or signed in successfully.");
      }
    } else {
      console.log("INFO: Session cookie already present. Proceeding with existing session.");
    }
  }
  async enhance({
    prompt,
    ...rest
  }) {
    await this.ensureAuth();
    try {
      console.log("START: Enhancing prompt...");
      const res = await this.axiosInstance.post(`${this.apiBase}/prompt-editor/enhance`, {
        prompt: prompt,
        ...rest
      }, {
        headers: {
          referer: "https://imagesart.ai/ai-image-generator"
        }
      });
      console.log("SUCCESS: Prompt enhanced.");
      return res.data;
    } catch (error) {
      console.error("ERROR: Failed to enhance prompt.", error.message);
      throw new Error(`Failed to enhance prompt: ${error.response?.data?.message || error.message}`);
    }
  }
  async generate({
    prompt,
    model = "flux-dev-fp8",
    aspect_ratio = "9:16",
    isPublic = true,
    watermark = true,
    inputType = "text",
    ...rest
  }) {
    await this.ensureAuth();
    try {
      console.log("START: Generating image...");
      if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
        throw new Error("Prompt cannot be empty for image generation.");
      }
      const res = await this.axiosInstance.post(`${this.apiBase}/image-generator`, {
        prompt: prompt,
        model: model,
        aspect_ratio: aspect_ratio,
        isPublic: isPublic,
        watermark: watermark,
        inputType: inputType,
        ...rest
      }, {
        headers: {
          referer: "https://imagesart.ai/ai-image-generator"
        }
      });
      console.log("SUCCESS: Image generated.");
      return res.data;
    } catch (error) {
      console.error("ERROR: Failed to generate image.", error.message);
      if (error.response && error.response.status === 400) {
        console.error("DEBUG: 400 Bad Request response data:", error.response.data);
      }
      throw new Error(`Failed to generate image: ${error.response?.data?.message || error.message}`);
    }
  }
  async buzzcut({
    imageUrl,
    targetHairstyle = "bald",
    hairColor = "no",
    aspectRatio = "2:3",
    watermark = true,
    ...rest
  }) {
    await this.ensureAuth();
    try {
      console.log("START: Applying buzz cut...");
      if (!imageUrl) {
        throw new Error("imageUrl is required for buzzcut.");
      }
      console.log(`INFO: Fetching image from URL: ${imageUrl}`);
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(imageResponse.data);
      const imageBase64 = imageBuffer.toString("base64");
      const initiateRes = await this.axiosInstance.post(`${this.apiBase}/ai-buzz-cut`, {
        imageBase64: imageBase64,
        targetHairstyle: targetHairstyle,
        hairColor: hairColor,
        aspectRatio: aspectRatio,
        watermark: watermark,
        ...rest
      }, {
        headers: {
          referer: "https://imagesart.ai/ai-buzz-cut"
        }
      });
      const {
        taskId,
        status
      } = initiateRes.data;
      if (status !== "GENERATING" || !taskId) {
        throw new Error(`Unexpected initial buzzcut status: ${status}`);
      }
      console.log(`INFO: Buzz cut initiated with taskId: ${taskId}. Polling for completion...`);
      let result = null;
      let attempts = 0;
      const maxAttempts = 60;
      const pollingInterval = 3e3;
      while (!result && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
        const pollingRes = await this.axiosInstance.post(`${this.apiBase}/ai-buzz-cut/complete/${taskId}`, {
          targetHairstyle: targetHairstyle,
          hairColor: hairColor,
          aspectRatio: aspectRatio,
          watermark: watermark,
          ...rest
        }, {
          headers: {
            referer: "https://imagesart.ai/ai-buzz-cut"
          }
        });
        if (pollingRes.data.imageUrl) {
          result = pollingRes.data;
          console.log("SUCCESS: Buzz cut image generated.");
        } else {
          console.log(`INFO: Buzz cut task ${taskId} still generating. Attempt ${attempts + 1}/${maxAttempts}.`);
        }
        attempts++;
      }
      if (!result) {
        throw new Error("Buzz cut image generation timed out.");
      }
      return result;
    } catch (error) {
      console.error("ERROR: Failed to apply buzz cut.", error.message);
      if (error.response && error.config && error.config.responseType === "arraybuffer") {
        throw new Error(`Failed to fetch or process image from URL: ${imageUrl}. Details: ${error.message}`);
      }
      throw new Error(`Failed to apply buzz cut: ${error.response?.data?.message || error.message}`);
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
        action: "generate | enhance | buzzcut"
      }
    });
  }
  const client = new ImagesArtAiClient();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await client[action](params);
        break;
      case "enhance":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await client[action](params);
        break;
      case "buzzcut":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl (required for ${action})`
          });
        }
        result = await client[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: generate | enhance | buzzcut`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}