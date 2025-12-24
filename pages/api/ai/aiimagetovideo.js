import axios from "axios";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class AIImageToVideo {
  constructor() {
    this.jar = new CookieJar();
    this.api = wrapper(axios.create({
      timeout: 3e4,
      jar: this.jar,
      withCredentials: true,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "accept-language": "id-ID",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        ...SpoofHead()
      }
    }));
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
  async getCookies(url = "https://aiimagetovideo.ai") {
    try {
      const cookieString = await this.jar.getCookieString(url);
      return cookieString;
    } catch (err) {
      console.error("❌ Get cookies error:", err?.message);
      return "";
    }
  }
  async setCookies(cookieString, url = "https://aiimagetovideo.ai") {
    try {
      if (cookieString) {
        const cookies = cookieString.split(";").map(c => c.trim()).filter(c => c);
        for (const cookie of cookies) {
          await this.jar.setCookie(cookie, url);
        }
        console.log("✅ Cookies set successfully");
      }
    } catch (err) {
      console.error("❌ Set cookies error:", err?.message);
    }
  }
  async logCookies(url = "https://aiimagetovideo.ai") {
    try {
      const cookies = await this.jar.getCookies(url);
      console.log(`\n--- 🍪 Cookies for ${url} ---`);
      if (cookies.length === 0) {
        console.log("No cookies found.");
      } else {
        cookies.forEach(cookie => {
          console.log(`${cookie.key}: ${cookie.value}`);
        });
      }
      console.log("--------------------------------\n");
    } catch (err) {
      console.error("Log cookies error:", err?.message);
    }
  }
  async createMail() {
    try {
      console.log("Creating mail...");
      const {
        data
      } = await this.api.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      console.log("✅ Mail created:", data?.email);
      return data?.email || null;
    } catch (err) {
      console.error("❌ Create mail error:", err?.message);
      return null;
    }
  }
  async getMails(email = "") {
    try {
      console.log("Fetching mail content...");
      const {
        data
      } = await this.api.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
      return data?.data?.[0]?.text_content || null;
    } catch (err) {
      console.error("❌ Get mails error:", err?.message);
      return null;
    }
  }
  async waitForVerificationLink(email, maxAttempts = 60, intervalMs = 3e3) {
    console.log(`🔍 Polling for verification link (max ${maxAttempts} attempts, ${intervalMs}ms interval)...`);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`📧 Attempt ${attempt}/${maxAttempts} - Checking email...`);
        const mailContent = await this.getMails(email);
        if (mailContent) {
          const verifyUrl = mailContent.match(/https:\/\/aiimagetovideo\.ai\/api\/auth\/callback\/email\?[^\s"<>]+/)?.[0];
          if (verifyUrl) {
            console.log("✅ Verification link found!");
            return verifyUrl;
          }
        }
        if (attempt < maxAttempts) {
          console.log(`⏳ No verification link yet, waiting ${intervalMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      } catch (err) {
        console.error(`❌ Error on attempt ${attempt}:`, err?.message);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      }
    }
    console.error("❌ Verification link not found after all attempts");
    return null;
  }
  async getCsrf() {
    try {
      console.log("Getting CSRF token...");
      const {
        data
      } = await this.api.get("https://aiimagetovideo.ai/api/auth/csrf", {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          referer: "https://aiimagetovideo.ai/auth/signin"
        }
      });
      console.log("✅ CSRF token received.");
      await this.logCookies();
      return data?.csrfToken || null;
    } catch (err) {
      console.error("❌ Get CSRF error:", err?.message);
      return null;
    }
  }
  async signIn(email = "", csrf = "") {
    try {
      console.log("Signing in with email...");
      const form = new URLSearchParams();
      form.append("email", email);
      form.append("callbackUrl", "https://aiimagetovideo.ai/dashboard/image-to-video");
      form.append("csrfToken", csrf);
      form.append("json", "true");
      const {
        data
      } = await this.api.post("https://aiimagetovideo.ai/api/auth/signin/email", form, {
        headers: {
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://aiimagetovideo.ai",
          referer: "https://aiimagetovideo.ai/auth/signin"
        }
      });
      console.log("✅ Sign in request sent.");
      await this.logCookies();
      return data;
    } catch (err) {
      console.error("❌ Sign in error:", err?.message);
      return null;
    }
  }
  async followRedirect(url = "") {
    try {
      console.log("Following verification redirect...");
      await this.api.get(url, {
        maxRedirects: 10,
        headers: {
          referer: "https://aiimagetovideo.ai/auth/verify-request"
        }
      });
      console.log("✅ Redirect followed successfully and session cookies should be set.");
      await this.logCookies();
      return true;
    } catch (err) {
      if (err.response) {
        console.warn(`⚠️ Follow redirect warning: Finished with status ${err.response.status}. This is often normal after login redirects. Proceeding.`);
        await this.logCookies();
        return true;
      }
      console.error("❌ Follow redirect error:", err?.message);
      return false;
    }
  }
  async getSession() {
    try {
      console.log("Fetching session data...");
      const {
        data
      } = await this.api.get("https://aiimagetovideo.ai/api/auth/session", {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          referer: "https://aiimagetovideo.ai/auth/verify-request"
        }
      });
      console.log("✅ Session data:", data);
      return data;
    } catch (err) {
      console.error("❌ Get session error:", err?.message);
      return null;
    }
  }
  async getUserInfo() {
    try {
      console.log("Fetching user info...");
      const {
        data
      } = await this.api.get("https://aiimagetovideo.ai/api/user/info", {
        headers: {
          accept: "application/json, text/plain, */*",
          referer: "https://aiimagetovideo.ai/dashboard/image-to-video"
        }
      });
      console.log("✅ User info:", data);
      return data;
    } catch (err) {
      console.error("❌ Get user info error:", err?.message);
      return null;
    }
  }
  async ensureAuth() {
    try {
      console.log("🚀 Starting authentication process...");
      const email = await this.createMail();
      if (!email) return {
        success: false,
        cookies: null
      };
      const csrf = await this.getCsrf();
      if (!csrf) return {
        success: false,
        cookies: null
      };
      await this.signIn(email, csrf);
      const verifyUrl = await this.waitForVerificationLink(email);
      if (verifyUrl) {
        console.log("✅ Verification URL found.");
        const redirectSuccess = await this.followRedirect(verifyUrl);
        if (!redirectSuccess) return {
          success: false,
          cookies: null
        };
        await this.getSession();
        await this.getUserInfo();
        console.log("🔑 Authentication completed successfully.");
        const cookies = await this.getCookies();
        return {
          success: true,
          cookies: cookies
        };
      }
      console.error("❌ Verification URL not found in email.");
      return {
        success: false,
        cookies: null
      };
    } catch (err) {
      console.error("❌ Auth process error:", err?.message);
      return {
        success: false,
        cookies: null
      };
    }
  }
  async txt2img({
    prompt = "",
    aspectRatio = "4:5",
    numImages = 1,
    ...rest
  } = {}) {
    try {
      const authResult = await this.ensureAuth();
      if (!authResult.success) {
        throw new Error("Authentication failed. Cannot proceed with txt2img.");
      }
      console.log("🎨 Starting text to image generation...");
      const payload = {
        prompt: prompt,
        aspectRatio: aspectRatio,
        raw: false,
        private: false,
        prompt_upsampling: false,
        output_format: "webp",
        output_quality: 80,
        mode: 6,
        safety_tolerance: 4,
        numImages: numImages,
        ...rest
      };
      const {
        data
      } = await this.api.post("https://aiimagetovideo.ai/api/image/generate", payload, {
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          origin: "https://aiimagetovideo.ai",
          referer: "https://aiimagetovideo.ai/dashboard/ai-image-generator"
        }
      });
      console.log("✅ Txt2img response:", data);
      const cookies = await this.getCookies();
      const encryptedData = {
        gen_type: "image",
        taskId: data?.data?.task_id || null,
        cookies: cookies
      };
      return await this.enc(encryptedData);
    } catch (err) {
      console.error("❌ Txt2img error:", err?.message);
      return {
        gen_type: "image",
        taskId: null
      };
    }
  }
  async txt2vid({
    prompt = "",
    quality = "360p",
    duration = 5,
    aspect_ratio = "16:9",
    ...rest
  } = {}) {
    try {
      const authResult = await this.ensureAuth();
      if (!authResult.success) {
        throw new Error("Authentication failed. Cannot proceed with txt2vid.");
      }
      console.log("🎬 Starting text to video generation...");
      const payload = {
        prompt: prompt,
        quality: quality,
        duration: duration,
        aspect_ratio: aspect_ratio,
        is_private: false,
        sound_effect_switch: false,
        sound_effect_content: "",
        lip_sync_tts_speaker_id: "Auto",
        ...rest
      };
      const {
        data
      } = await this.api.post("https://aiimagetovideo.ai/api/video/text-to-video", payload, {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          origin: "https://aiimagetovideo.ai",
          referer: "https://aiimagetovideo.ai/dashboard/text-to-video"
        }
      });
      console.log("✅ Txt2vid response:", data);
      const cookies = await this.getCookies();
      const encryptedData = {
        gen_type: "video",
        taskId: data?.video_id || null,
        cookies: cookies
      };
      return await this.enc(encryptedData);
    } catch (err) {
      console.error("❌ Txt2vid error:", err?.message);
      return {
        gen_type: "video",
        taskId: null
      };
    }
  }
  async img2vid({
    prompt = "",
    imageUrl = "",
    quality = "360p",
    duration = 5,
    ...rest
  } = {}) {
    try {
      const authResult = await this.ensureAuth();
      if (!authResult.success) {
        throw new Error("Authentication failed. Cannot proceed with img2vid.");
      }
      console.log("🖼️➡️🎬 Starting image to video generation...");
      const form = new FormData();
      if (imageUrl) {
        console.log("📥 Downloading image...");
        const {
          data: imgData,
          headers: responseHeaders
        } = await this.api.get(imageUrl, {
          responseType: "arraybuffer"
        });
        const contentType = responseHeaders["content-type"] || responseHeaders["Content-Type"] || "image/jpeg";
        let extension = "jpg";
        if (contentType.includes("webp")) extension = "webp";
        if (contentType.includes("png")) extension = "png";
        if (contentType.includes("gif")) extension = "gif";
        const filename = `image.${extension}`;
        form.append("image", Buffer.from(imgData), {
          filename: filename,
          contentType: contentType,
          knownLength: imgData.byteLength
        });
        console.log("✅ Image downloaded");
      }
      form.append("prompt", prompt);
      form.append("duration", duration.toString());
      form.append("quality", quality);
      form.append("is_private", "false");
      form.append("sound_effect_switch", "false");
      form.append("sound_effect_content", "");
      form.append("lip_sync_tts_speaker_id", "Auto");
      Object.entries(rest).forEach(([key, val]) => {
        form.append(key, val?.toString() || "");
      });
      const {
        data
      } = await this.api.post("https://aiimagetovideo.ai/api/video/image-to-video", form, {
        headers: {
          accept: "*/*",
          origin: "https://aiimagetovideo.ai",
          referer: "https://aiimagetovideo.ai/dashboard/image-to-video",
          ...form.getHeaders()
        }
      });
      console.log("✅ Img2vid response:", data);
      const cookies = await this.getCookies();
      return {
        gen_type: "video",
        taskId: data?.video_id || null,
        cookies: cookies,
        ...data
      };
    } catch (err) {
      console.error("❌ Img2vid error:", err?.message);
      return {
        gen_type: "video",
        taskId: null
      };
    }
  }
  async status({
    task_id,
    ...rest
  } = {}) {
    try {
      const decryptedData = await this.dec(task_id);
      const {
        taskId,
        cookies,
        gen_type
      } = decryptedData;
      if (!cookies || !taskId) {
        throw new Error("Membutuhkan taskId dan token untuk memeriksa status.");
      }
      if (cookies) {
        await this.setCookies(cookies);
      }
      if (!taskId) {
        console.warn("⚠️ No task ID provided to check status.");
        return null;
      }
      let url, method = "GET";
      if (gen_type === "image") {
        url = `https://aiimagetovideo.ai/api/image/status?task_id=${taskId}`;
      } else {
        url = `https://aiimagetovideo.ai/api/video/detail/${taskId}`;
        method = "POST";
      }
      const config = {
        method: method,
        url: url,
        headers: {
          accept: "*/*",
          "content-type": "application/json"
        }
      };
      if (method === "POST") {
        config.data = {};
      }
      const {
        data
      } = await this.api(config);
      console.log(`📊 ${gen_type} status:`, data);
      return data;
    } catch (err) {
      console.error("❌ Status error:", err?.message);
      return {
        data: null
      };
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
  const api = new AIImageToVideo();
  try {
    let response;
    switch (action) {
      case "img2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for img2vid."
          });
        }
        response = await api.img2vid(params);
        return res.status(200).json({
          task_id: response
        });
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2vid."
          });
        }
        response = await api.txt2vid(params);
        return res.status(200).json({
          task_id: response
        });
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2img."
          });
        }
        response = await api.txt2img(params);
        return res.status(200).json({
          task_id: response
        });
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await api.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'img2vid', 'txt2vid', 'txt2img', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}