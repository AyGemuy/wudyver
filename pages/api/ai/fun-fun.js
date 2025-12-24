import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class FunFunArt {
  constructor() {
    this.baseURL = "https://www.funfun.art/api";
    this.tempMailAPI = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.sessionToken = null;
    this.csrfToken = null;
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    console.log("[INIT] FunFunArt instance created.");
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
  getSessionTokenFromCookies() {
    const cookies = this.cookieJar.getCookiesSync("https://www.funfun.art");
    const sessionCookie = cookies.find(cookie => cookie.key === "__Secure-authjs.session-token");
    const token = sessionCookie ? sessionCookie.value : null;
    console.log("[COOKIE] Retrieved session token from cookiejar:", token ? token.substring(0, 10) + "..." : "null");
    return token;
  }
  getCSRFTokenFromCookies() {
    const cookies = this.cookieJar.getCookiesSync("https://www.funfun.art");
    const csrfCookie = cookies.find(cookie => cookie.key === "__Host-authjs.csrf-token");
    const token = csrfCookie ? csrfCookie.value.split("%7C")[0] : null;
    console.log("[COOKIE] Retrieved CSRF token from cookiejar:", token ? token.substring(0, 10) + "..." : "null");
    return token;
  }
  async createTempEmail() {
    console.log("[API] Creating temporary email...");
    try {
      const response = await axios.get(`${this.tempMailAPI}?action=create`);
      console.log("[API] Temporary email created:", response.data.email);
      return response.data.email;
    } catch (error) {
      console.error("[API] Failed to create temp email:", error.message);
      throw new Error(`Failed to create temp email: ${error.message}`);
    }
  }
  async checkOTPLink(email) {
    console.log(`[API] Checking OTP link for email: ${email}...`);
    try {
      const response = await axios.get(`${this.tempMailAPI}?action=message&email=${email}`);
      const messages = response.data.data;
      if (messages && messages.length > 0) {
        const textContent = messages[0].text_content;
        const urlMatch = textContent.match(/https:\/\/www\.funfun\.art\/api\/auth\/callback\/custom_email[^\s\r\n]*/);
        const otpLink = urlMatch ? urlMatch[0] : null;
        console.log("[API] OTP link found:", otpLink ? otpLink.substring(0, 50) + "..." : "null");
        return otpLink;
      }
      console.log("[API] No OTP link found yet.");
      return null;
    } catch (error) {
      console.error("[API] Failed to check OTP:", error.message);
      throw new Error(`Failed to check OTP: ${error.message}`);
    }
  }
  async initializeSession() {
    console.log("[SESSION] Initializing session by visiting main page...");
    try {
      await this.client.get("https://www.funfun.art/ai-art-generator?pipeline=img2vid", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          pragma: "no-cache",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      this.sessionToken = this.getSessionTokenFromCookies();
      console.log("[SESSION] Main page visited. Session token might be set.");
    } catch (error) {
      console.warn("[SESSION] Error initializing session (might be normal, just to set cookies):", error.message);
      this.sessionToken = this.getSessionTokenFromCookies();
    }
  }
  async getCSRFToken() {
    console.log("[CSRF] Requesting CSRF token...");
    try {
      const response = await this.client.get(`${this.baseURL}/auth/csrf`, {
        headers: {
          ...this.headers,
          "content-type": "application/json",
          referer: "https://www.funfun.art/ai-art-generator?pipeline=img2vid&redirect=https%3A%2F%2Fwww.funfun.art%2Fai-art-generator%3Fpipeline%3Dimg2vid"
        }
      });
      this.csrfToken = response.data.csrfToken;
      console.log("[CSRF] CSRF token obtained:", this.csrfToken.substring(0, 10) + "...");
      return this.csrfToken;
    } catch (error) {
      console.error("[CSRF] Failed to get CSRF token:", error.message);
      throw new Error(`Failed to get CSRF token: ${error.message}`);
    }
  }
  async signInWithEmail(email, callbackUrl = "https://www.funfun.art/ai-art-generator?pipeline=img2vid") {
    console.log(`[AUTH] Sending sign-in request for email: ${email}...`);
    try {
      if (!this.csrfToken) {
        this.csrfToken = this.getCSRFTokenFromCookies();
        if (!this.csrfToken) {
          await this.getCSRFToken();
        }
      }
      const data = new URLSearchParams({
        email: email,
        callbackUrl: callbackUrl,
        redirect: "false",
        csrfToken: this.csrfToken
      });
      const response = await this.client.post(`${this.baseURL}/auth/signin/custom_email`, data, {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://www.funfun.art",
          referer: "https://www.funfun.art/ai-art-generator?pipeline=img2vid&redirect=https%3A%2F%2Fwww.funfun.art%2Fai-art-generator%3Fpipeline%3Dimg2vid",
          "x-auth-return-redirect": "1"
        }
      });
      console.log("[AUTH] Sign-in request sent. Check email for OTP.");
      return response.data;
    } catch (error) {
      console.error("[AUTH] Failed to sign in:", error.message);
      throw new Error(`Failed to sign in: ${error.message}`);
    }
  }
  async verifyOTPCallback(callbackUrl) {
    console.log(`[AUTH] Verifying OTP callback URL: ${callbackUrl.substring(0, 50)}...`);
    try {
      const response = await this.client.get(callbackUrl, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=0, i",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        },
        maxRedirects: 5
      });
      this.sessionToken = this.getSessionTokenFromCookies();
      if (!this.sessionToken) {
        console.error("[AUTH] OTP verification successful, but session token not found after callback.");
        throw new Error("OTP verification successful, but session token not found.");
      }
      console.log("[AUTH] OTP callback verified. Session token updated.");
      return response.data;
    } catch (error) {
      console.error("[AUTH] Failed to verify OTP callback:", error.message);
      this.sessionToken = this.getSessionTokenFromCookies();
      if (!this.sessionToken) {
        throw new Error(`Failed to verify OTP: ${error.message}`);
      }
      console.warn("[AUTH] OTP callback failed, but session token might still be present from previous steps.");
      return null;
    }
  }
  async generateUploadLinks(files) {
    console.log("[API] Generating upload links for files...");
    try {
      const response = await this.client.post(`${this.baseURL}/generate-upload-links`, files, {
        headers: {
          ...this.headers,
          "content-type": "application/json",
          origin: "https://www.funfun.art",
          referer: "https://www.funfun.art/ai-art-generator?pipeline=img2vid"
        }
      });
      console.log("[API] Upload links generated successfully.");
      return response.data;
    } catch (error) {
      console.error("[API] Failed to generate upload links:", error.message);
      throw new Error(`Failed to generate upload links: ${error.message}`);
    }
  }
  async uploadFile(signedUrl, fileBuffer, mimeType) {
    console.log("[UPLOAD] Uploading file to signed URL...");
    try {
      const response = await axios.put(signedUrl, fileBuffer, {
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "id-ID,id;q=0.9",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Type": mimeType,
          Origin: "https://www.funfun.art",
          Pragma: "no-cache",
          Referer: "https://www.funfun.art/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      if (response.status === 200) {
        console.log("[UPLOAD] File uploaded successfully.");
      } else {
        console.warn("[UPLOAD] File upload returned non-200 status:", response.status);
      }
      return response.status === 200;
    } catch (error) {
      console.error("[UPLOAD] Failed to upload file:", error.message);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }
  async txt2img({
    prompt,
    ...rest
  }) {
    console.log("[TXT2IMG] Sending txt2img request...");
    this.sessionToken = this.getSessionTokenFromCookies();
    if (!this.sessionToken) {
      console.error("[TXT2IMG] No active session token found. Authentication may be required.");
      throw new Error("No active session token. Please authenticate first.");
    }
    try {
      const defaultPayload = {
        pipeline: "txt2img",
        modelId: "cm84ahhca000008jy7jay2muj",
        seed: 0,
        loras: [{
          id: "photo_realism",
          type: "lora",
          baseModel: null,
          creditsCost: 0,
          displayName: "Photo Realism",
          description: null,
          image: null,
          weights: "https://s3.videopal.ai/app/ai/flux-1d/loras/aidmaHyperrealism-FLUX-v0.3.safetensors",
          samples: ["https://www.videopal.ai/images/styles/photo-realism-001.jpg"],
          promptTemplate: null,
          negativePromptTemplate: null,
          scheduler: null,
          clipSkip: null,
          steps: 28,
          cfg: 3,
          fps: null,
          motionBucketId: null,
          noiseAugStrength: null,
          numFrames: null,
          provider: null,
          fields: null,
          schema: null,
          scale: .5,
          trigger: "aidmaHyperrealism",
          ownerId: null,
          isEnabled: true,
          isNSFW: false,
          createdAt: "2024-10-13T08:47:00.000Z"
        }],
        ratio: "16:9",
        steps: 31,
        prompt: prompt,
        batchSize: 1,
        ...rest
      };
      const response = await this.client.post(`${this.baseURL}/editor/generate`, defaultPayload, {
        headers: {
          ...this.headers,
          "content-type": "application/json",
          origin: "https://www.funfun.art",
          referer: "https://www.funfun.art/ai-art-generator?pipeline=img2vid",
          priority: "u=1, i"
        }
      });
      const dataToEncrypt = {
        id: response.data.id,
        session: this.sessionToken
      };
      const encryptedTaskId = await this.enc(dataToEncrypt);
      console.log(`[TXT2IMG] Request sent, API ID: ${response.data.id}, Encrypted task_id generated.`);
      return {
        task_id: encryptedTaskId,
        ...response.data
      };
    } catch (error) {
      console.error("[TXT2IMG] Failed to generate txt2img:", error.message);
      throw new Error(`Failed to generate txt2img: ${error.message}`);
    }
  }
  async img2img({
    imageUrl,
    prompt,
    ...rest
  }) {
    console.log("[IMG2IMG] Sending img2img request...");
    this.sessionToken = this.getSessionTokenFromCookies();
    if (!this.sessionToken) {
      console.error("[IMG2IMG] No active session token found. Authentication may be required.");
      throw new Error("No active session token. Please authenticate first.");
    }
    try {
      const defaultPayload = {
        pipeline: "img2img",
        modelId: "cm8h6w68o000008l5bnlw90xi",
        loras: [{
          id: "photo_realism",
          type: "lora",
          baseModel: null,
          creditsCost: 0,
          displayName: "Photo Realism",
          description: null,
          image: null,
          weights: "https://s3.videopal.ai/app/ai/flux-1d/loras/aidmaHyperrealism-FLUX-v0.3.safetensors",
          samples: ["https://www.videopal.ai/images/styles/photo-realism-001.jpg"],
          promptTemplate: null,
          negativePromptTemplate: null,
          scheduler: null,
          clipSkip: null,
          steps: 28,
          cfg: 3,
          fps: null,
          motionBucketId: null,
          noiseAugStrength: null,
          numFrames: null,
          provider: null,
          fields: null,
          schema: null,
          scale: .5,
          trigger: "aidmaHyperrealism",
          ownerId: null,
          isEnabled: true,
          isNSFW: false,
          createdAt: "2024-10-13T08:47:00.000Z"
        }],
        ratio: "16:9",
        steps: 18,
        prompt: prompt,
        batchSize: 1,
        _upload_image: {
          mimeType: "image/jpeg",
          size: 48506,
          name: "uploaded-image.jpg",
          url: imageUrl,
          tunnelUrl: imageUrl
        },
        ...rest
      };
      const response = await this.client.post(`${this.baseURL}/editor/generate`, defaultPayload, {
        headers: {
          ...this.headers,
          "content-type": "application/json",
          origin: "https://www.funfun.art",
          referer: "https://www.funfun.art/ai-art-generator?pipeline=img2vid",
          priority: "u=1, i"
        }
      });
      const dataToEncrypt = {
        id: response.data.id,
        session: this.sessionToken
      };
      const encryptedTaskId = await this.enc(dataToEncrypt);
      console.log(`[IMG2IMG] Request sent, API ID: ${response.data.id}, Encrypted task_id generated.`);
      return {
        task_id: encryptedTaskId,
        ...response.data
      };
    } catch (error) {
      console.error("[IMG2IMG] Failed to generate img2img:", error.message);
      throw new Error(`Failed to generate img2img: ${error.message}`);
    }
  }
  async status({
    task_id
  }) {
    console.log(`[STATUS] Checking job status for encrypted task_id: ${task_id.substring(0, 30)}...`);
    try {
      const decryptedData = await this.dec(task_id);
      const originalTaskId = decryptedData.id;
      const associatedSessionToken = decryptedData.session;
      const currentSessionToken = this.getSessionTokenFromCookies();
      if (associatedSessionToken && currentSessionToken !== associatedSessionToken) {
        console.warn(`[STATUS] Session token mismatch detected. Updating cookiejar to use associatedSessionToken.`);
        this.cookieJar.setCookieSync(`__Secure-authjs.session-token=${associatedSessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax`, "https://www.funfun.art");
        this.sessionToken = associatedSessionToken;
        console.log(`[STATUS] Cookiejar updated with token: ${associatedSessionToken.substring(0, 10)}...`);
      } else {
        console.log("[STATUS] Current session token matches or is already updated.");
      }
      const response = await this.client.get(`${this.baseURL}/jobs/${originalTaskId}`, {
        headers: {
          ...this.headers,
          accept: "application/json, text/plain, */*",
          referer: `https://www.funfun.art/ai-art-generator?pipeline=img2vid&jobId=${originalTaskId}`,
          priority: "u=1, i"
        }
      });
      console.log(`[STATUS] Job status for ${originalTaskId}: ${response.data.status}`);
      return response.data;
    } catch (error) {
      console.error("[STATUS] Failed to get job status:", error.message);
      throw new Error(`Failed to get job status: ${error.message}`);
    }
  }
  async authenticate() {
    console.log("--- STARTING AUTHENTICATION FLOW ---");
    try {
      await this.initializeSession();
      this.debugSessionToken();
      const email = await this.createTempEmail();
      await this.getCSRFToken();
      await this.signInWithEmail(email);
      let attempts = 0;
      let otpLink = null;
      console.log("[AUTH] Waiting for OTP link (max 15 attempts, 3s interval)...");
      while (attempts < 15 && !otpLink) {
        await new Promise(resolve => setTimeout(resolve, 3e3));
        otpLink = await this.checkOTPLink(email);
        attempts++;
      }
      if (!otpLink) {
        console.error("[AUTH] OTP link not received after maximum attempts.");
        throw new Error("OTP link not received");
      }
      await this.verifyOTPCallback(otpLink);
      this.sessionToken = this.getSessionTokenFromCookies();
      if (!this.sessionToken) {
        console.error("[AUTH] Authentication completed, but sessionToken is still null. This indicates a problem.");
        throw new Error("Authentication completed, but session token is missing.");
      }
      console.log("--- AUTHENTICATION SUCCESSFUL ---");
      this.debugSessionToken();
      return {
        email: email,
        sessionToken: this.sessionToken,
        authenticated: !!this.sessionToken
      };
    } catch (error) {
      console.error(`--- AUTHENTICATION FAILED: ${error.message} ---`);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
  debugSessionToken() {
    console.log("[DEBUG] Current Session Token (this.sessionToken):", this.sessionToken ? this.sessionToken.substring(0, 10) + "..." : "null");
    console.log("[DEBUG] All cookies in cookiejar:");
    this.cookieJar.getCookiesSync("https://www.funfun.art").forEach(cookie => {
      const expiry = cookie.expires instanceof Date ? cookie.expires.toISOString() : cookie.expires === "Infinity" ? "Never" : "Session";
      console.log(`  - ${cookie.key}=${cookie.value.substring(0, 10)}... (Domain: ${cookie.domain}, Path: ${cookie.path}, Expires: ${expiry})`);
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action (txt2img, img2img, or status) is required."
    });
  }
  const funfun = new FunFunArt();
  try {
    console.log("[API Route] Authenticating FunFunArt instance...");
    await funfun.authenticate();
    console.log("[API Route] FunFunArt instance authenticated.");
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'txt2img' action (text-to-image generation)."
          });
        }
        console.log(`[API Route] Calling txt2img with prompt: "${params.prompt.substring(0, 50)}..."`);
        const txt2imgResponse = await funfun.txt2img(params);
        return res.status(200).json(txt2imgResponse);
      case "img2img":
        if (!params.imageUrl || !params.prompt) {
          return res.status(400).json({
            error: "imageUrl and prompt are required for 'img2img' action (image-to-image generation)."
          });
        }
        console.log(`[API Route] Calling img2img with imageUrl: "${params.imageUrl.substring(0, 50)}..." and prompt: "${params.prompt.substring(0, 50)}..."`);
        const img2imgResponse = await funfun.img2img(params);
        return res.status(200).json(img2imgResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        console.log(`[API Route] Calling status for task_id: ${params.task_id.substring(0, 30)}...`);
        const statusResponse = await funfun.status(params);
        return res.status(200).json(statusResponse);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions are 'txt2img', 'img2img', and 'status'."
        });
    }
  } catch (error) {
    console.error("[API Route] Error during FunFunArt operation:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}