import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
import crypto from "crypto";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import SpoofHead from "@/lib/spoof-head";
class TotalFreeAIApi {
  constructor() {
    this.baseUrl = "https://totalfreeai.com";
    this.baseImg = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Joko_Widodo_2014_official_portrait.jpg/500px-Joko_Widodo_2014_official_portrait.jpg";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      },
      withCredentials: true,
      jar: this.jar
    }));
  }
  randID(len = 16) {
    return crypto.randomBytes(len).toString("hex");
  }
  buildHeaders(extra = {}) {
    return {
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      "x-request-id": this.randID(8),
      ...SpoofHead(),
      ...extra
    };
  }
  async fetchCsrf(path = "/") {
    try {
      console.log(`[CSRF] Fetching ${this.baseUrl}${path} for token...`);
      const headers = this.buildHeaders({
        "content-type": "text/html"
      });
      const res = await this.client.get(path, {
        headers: headers
      });
      const $ = cheerio.load(res.data);
      let csrfToken = $(`form[action="${path}"] input[name="csrfmiddlewaretoken"]`).val();
      if (!csrfToken) csrfToken = $('input[name="csrfmiddlewaretoken"]').val();
      if (csrfToken) {
        console.log("[CSRF] Token obtained from HTML.");
        return csrfToken;
      } else {
        console.warn(`[CSRF] No token found on ${path} HTML.`);
      }
      return null;
    } catch (error) {
      console.error(`[CSRF ERR] Failed to fetch or parse ${path} for CSRF: ${error.message}`);
      return null;
    }
  }
  async submitCookieConsent() {
    try {
      console.log("[CONSENT] Submitting cookie consent... ");
      const csrfToken = await this.fetchCsrf("/");
      if (!csrfToken) throw new Error("Failed to obtain CSRF token for consent.");
      const payload = {
        status: "accepted",
        analytics: true,
        marketing: true,
        timestamp: new Date().toISOString()
      };
      const headers = this.buildHeaders({
        "content-type": "application/json",
        "x-csrftoken": csrfToken,
        "x-requested-with": "XMLHttpRequest"
      });
      const res = await this.client.post("/api/save-cookie-consent/", payload, {
        headers: headers
      });
      console.log("[CONSENT] Consent submitted:", res.data);
      return res.data;
    } catch (err) {
      console.error(`[CONSENT ERR] Failed to submit consent: ${err.message}`);
      throw err;
    }
  }
  async getData(imageUrl) {
    try {
      const {
        data: buffer,
        headers
      } = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = headers["content-type"] || "image/png";
      const extension = contentType.includes("jpeg") ? ".jpeg" : contentType.includes("png") ? ".png" : ".jpg";
      const filename = `image${extension}`;
      return {
        buffer: buffer,
        contentType: contentType,
        filename: filename
      };
    } catch (error) {
      throw new Error("Error retrieving image data: " + (error.message || error));
    }
  }
  async txt2img({
    prompt = "An elaborate steampunk metropolis at golden hour, filled with brass airships, intricate clockwork mechanisms, Victorian-era fashion, glowing gears, smoke and steam effects, highly detailed, isometric perspective, by artists like Jakub Rozalski"
  }) {
    try {
      console.log("[GEN] Starting image generation...");
      await this.submitCookieConsent();
      const csrfToken = await this.fetchCsrf("/image-generator/");
      if (!csrfToken) throw new Error("Failed to obtain CSRF token for image generation.");
      const formData = new FormData();
      formData.append("prompt", prompt);
      const headers = this.buildHeaders({
        "x-csrftoken": csrfToken
      });
      const finalHeaders = {
        ...headers,
        ...formData.headers
      };
      const res = await this.client.post("/image-generator/", formData, {
        headers: finalHeaders
      });
      console.log("[GEN] Image generation successful!");
      return res.data;
    } catch (err) {
      console.error(`[GEN ERR] Failed to generate image: ${err.message}`);
      throw err;
    }
  }
  async chat({
    prompt: message,
    session_id = "",
    ...rest
  }) {
    try {
      console.log("[CHAT] Starting chat request...");
      await this.submitCookieConsent();
      const csrfToken = await this.fetchCsrf("/chat/");
      if (!csrfToken) throw new Error("Failed to obtain CSRF token for chat.");
      const payload = {
        message: message,
        session_id: session_id,
        ...rest
      };
      const headers = this.buildHeaders({
        "content-type": "application/json",
        "x-csrftoken": csrfToken,
        "x-requested-with": "XMLHttpRequest",
        referer: `${this.baseUrl}/chat/`
      });
      const res = await this.client.post("/chat/", payload, {
        headers: headers
      });
      console.log("[CHAT] Chat request successful!");
      return res.data;
    } catch (err) {
      console.error(`[CHAT ERR] Failed to chat: ${err.message}`);
      throw err;
    }
  }
  async swap({
    faceUrl = this.baseImg,
    targetUrl = this.baseImg
  }) {
    try {
      console.log("[FACESWAP] Starting face swap request...");
      if (!faceUrl || !targetUrl) throw new Error("Both faceUrl and targetUrl are required.");
      await this.submitCookieConsent();
      const csrfToken = await this.fetchCsrf("/face-swap/");
      if (!csrfToken) throw new Error("Failed to obtain CSRF token for face swap.");
      const faceImage = await this.getData(faceUrl);
      const targetImage = await this.getData(targetUrl);
      const formData = new FormData();
      formData.set("face_file", new Blob([faceImage.buffer], {
        type: faceImage.contentType
      }), faceImage.filename);
      formData.set("image_file", new Blob([targetImage.buffer], {
        type: targetImage.contentType
      }), targetImage.filename);
      const headers = this.buildHeaders({
        "x-csrftoken": csrfToken,
        referer: `${this.baseUrl}/face-swap/`
      });
      const finalHeaders = {
        ...headers,
        ...formData.headers
      };
      const res = await this.client.post("/face-swap/", formData, {
        headers: finalHeaders
      });
      console.log("[FACESWAP] Face swap successful!");
      return res.data;
    } catch (err) {
      console.error(`[FACESWAP ERR] Failed to perform face swap: ${err.message}`);
      throw err;
    }
  }
  async img2stic({
    imageUrl = this.baseImg,
    prompt = "turn to ghibli",
    mode = "textImage"
  }) {
    try {
      console.log("[STICKER] Starting image to sticker request...");
      if (!imageUrl) throw new Error("imageUrl is required.");
      await this.submitCookieConsent();
      const csrfToken = await this.fetchCsrf("/image-to-sticker/");
      if (!csrfToken) throw new Error("Failed to obtain CSRF token for image to sticker.");
      const imageFile = await this.getData(imageUrl);
      const formData = new FormData();
      formData.set("image", new Blob([imageFile.buffer], {
        type: imageFile.contentType
      }), imageFile.filename);
      formData.append("prompt", prompt);
      formData.append("mode", mode);
      const headers = this.buildHeaders({
        "x-csrftoken": csrfToken,
        referer: `${this.baseUrl}/image-to-sticker/`
      });
      const finalHeaders = {
        ...headers,
        ...formData.headers
      };
      const res = await this.client.post("/image-to-sticker/", formData, {
        headers: finalHeaders
      });
      console.log("[STICKER] Image to sticker successful!");
      return res.data;
    } catch (err) {
      console.error(`[STICKER ERR] Failed to convert image to sticker: ${err.message}`);
      throw err;
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
        action: "txt2img | chat | swap | img2stic"
      }
    });
  }
  const totalFreeAI = new TotalFreeAIApi();
  try {
    let result;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await totalFreeAI.txt2img(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await totalFreeAI.chat(params);
        break;
      case "swap":
        if (!params.faceUrl || !params.targetUrl) {
          return res.status(400).json({
            error: `Missing required fields: faceUrl and targetUrl (required for ${action})`
          });
        }
        result = await totalFreeAI.swap(params);
        break;
      case "img2stic":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl (required for ${action})`
          });
        }
        result = await totalFreeAI.img2stic(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: txt2img | chat | swap | img2stic`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[API ERROR] ${action}:`, error.message);
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}