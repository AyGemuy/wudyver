import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import SpoofHead from "@/lib/spoof-head";
class AmiaiGenerator {
  constructor() {
    this.baseUrl = "https://ai.amiai.club";
    this.token = "";
    this.listTools = ["animation", "change-clothes-pro", "enhance", "image-to-image", "nsfw-image-to-image", "nsfw-text-to-image-v2", "pretty", "restore", "segment", "text-to-image-v2", "undress"];
    this.prompts = ["Convert this image into a whimsical, magical Ghibli-style, keeping all elements the same, but applying soft textures, gentle shading, and pastel tones.", "Change the style of this image to Studio Ghibli, but do not add any new elements. Apply subtle shading, lighting, and hand-painted textures to create a dreamy atmosphere.", "Recreate this image in Studio Ghibli's signature style, preserving the composition and details, focusing on soft textures, lighting, and vibrant pastel colors.", "Apply a Studio Ghibli-style transformation to this image, using magical lighting, smooth shading, and soft colors, while keeping the original scene and objects unchanged.", "Transform this image into a gentle, Ghibli-style illustration without adding new elements, using warm, pastel colors, soft textures, and whimsical lighting.", "Transform this image into a soft, Ghibli-style illustration with gentle textures, warm pastel colors, and no new elements added to the scene.", "Convert this image into a dreamy Ghibli-style artwork, maintaining the original scene but applying soft shading, whimsical lighting, and painterly textures.", "Turn this picture into a Studio Ghibli animated style, maintaining 100% of the original image’s composition, details, and subjects.", "Reimagine this image in Studio Ghibli style, preserving the composition and adding magical lighting, soft colors, and painterly textures for a whimsical look."];
  }
  getRandomPrompt() {
    const randomIndex = Math.floor(Math.random() * this.prompts.length);
    return this.prompts[randomIndex];
  }
  buildHeaders(token = "", extra = {}) {
    return {
      authorization: token,
      origin: "https://www.myimg.ai",
      referer: "https://www.myimg.ai/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      ...SpoofHead(),
      ...extra
    };
  }
  async loginAsGuest() {
    try {
      console.log("[LOGIN] Logging in as guest...");
      const res = await axios.post(`${this.baseUrl}/api/account/login`, {
        platform: "guest"
      }, {
        headers: {
          "content-type": "application/json",
          ...this.buildHeaders()
        },
        withCredentials: true
      });
      this.token = res.data?.result?.token || "";
      console.log("[LOGIN] Token received:", this.token ? "Yes" : "No");
    } catch (err) {
      console.error("[LOGIN] Error:", err.message);
      throw err;
    }
  }
  async uploadImage(url, filename = "image.png") {
    try {
      console.log("[UPLOAD] Logging in and uploading image...");
      await this.loginAsGuest();
      const {
        data: buffer,
        headers
      } = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const contentType = headers["content-type"] || "image/png";
      const form = new FormData();
      form.set("file", new Blob([buffer], {
        type: contentType
      }), filename);
      const res = await axios.post(`${this.baseUrl}/api/upload?action_type=image_image_to_image`, form, {
        headers: {
          ...form.headers,
          ...this.buildHeaders(this.token)
        }
      });
      console.log("[UPLOAD] Upload complete");
      return res.data?.result;
    } catch (err) {
      console.error("[UPLOAD] Error:", err.message);
      throw err;
    }
  }
  async transformImage(imageUrl, style, width = 576, height = 1024, tools = "image-to-image", opt = {}) {
    try {
      console.log("[TRANSFORM] Starting transformation using tool:", tools);
      if (!this.listTools.includes(tools)) {
        throw new Error(`Tools "${tools}" tidak tersedia. Pilihan yang tersedia: ${this.listTools.join(", ")}`);
      }
      const payload = {
        imageUrl: imageUrl,
        style: style,
        width: width,
        height: height,
        website: "myimg",
        ...opt
      };
      const res = await axios.post(`${this.baseUrl}/api/image/${tools}`, payload, {
        headers: {
          "content-type": "application/json",
          ...this.buildHeaders(this.token)
        }
      });
      const actionId = res.data?.actionId;
      console.log("[TRANSFORM] Action ID:", actionId);
      if (!actionId) throw new Error("Action ID tidak ditemukan");
      return actionId;
    } catch (err) {
      console.error("[TRANSFORM] Error:", err.message);
      throw err;
    }
  }
  async pollResult(actionId) {
    const url = `${this.baseUrl}/api/action/info?action_id=${actionId}&website=myimg`;
    try {
      console.log("[POLL] Polling for result...");
      while (true) {
        const res = await axios.get(url, {
          headers: this.buildHeaders(this.token)
        });
        const resultUrl = JSON.parse(res.data?.result?.response || "{}")?.resultUrl;
        if (resultUrl) {
          console.log("[POLL] Result found:", resultUrl);
          return resultUrl;
        }
        console.log("[POLL] Waiting for result...");
        await new Promise(r => setTimeout(r, 3e3));
      }
    } catch (err) {
      console.error("[POLL] Error:", err.message);
      throw err;
    }
  }
  async generate({
    imageUrl,
    style = this.getRandomPrompt(),
    width,
    height,
    tools = "image-to-image",
    ...opt
  }) {
    try {
      console.log("[FLOW] Processing image...");
      const uploadedUrl = await this.uploadImage(imageUrl);
      const actionId = await this.transformImage(uploadedUrl, style, width, height, tools, opt);
      const finalImage = await this.pollResult(actionId);
      console.log("[FLOW] Processing complete");
      return {
        url: finalImage
      };
    } catch (err) {
      console.error("[FLOW] Error:", err.message);
      if (err.message.includes("Tools")) {
        return {
          error: err.message,
          availableTools: this.listTools
        };
      }
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const uploader = new AmiaiGenerator();
  try {
    const data = await uploader.generate(params);
    if (data?.error && data.availableTools) {
      return res.status(400).json(data);
    }
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}