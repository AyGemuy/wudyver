import axios from "axios";
import crypto from "crypto";
class CartoonyAPI {
  constructor() {
    this.config = {
      base: "https://api.cartoony.app",
      key: "a2db5e6b-d1cc-426f-833c-202531f2d29a",
      endpoint: {
        generate: "/api/v1/generate/image",
        styles: "/api/v1/styles"
      },
      defaults: {
        quality: "medium",
        prompt: "Create a cartoony style image",
        style: "anime"
      }
    };
    this.session = {
      userId: crypto.randomBytes(16).toString("hex"),
      deviceId: crypto.randomUUID(),
      startTime: Date.now()
    };
  }
  _initData() {
    return {
      userId: this.session.userId,
      timestamp: Date.now(),
      platform: "nodejs",
      appVersion: "1.0.0",
      locale: "en",
      isProUser: false,
      dailyCount: Math.floor((Date.now() - this.session.startTime) / 1e4),
      rcUserId: null,
      packageId: null,
      deviceId: this.session.deviceId
    };
  }
  async generate({
    imageUrl,
    prompt,
    style,
    quality,
    genType,
    ...rest
  }) {
    console.log("[Generate] Starting request...");
    try {
      const formData = new FormData();
      const userData = rest.userData || this._initData();
      const finalQuality = quality || this.config.defaults.quality;
      const finalPrompt = prompt || this.config.defaults.prompt;
      const finalStyle = style || this.config.defaults.style;
      const finalGenType = imageUrl ? "image_to_image" : "text_to_image";
      if (imageUrl) {
        console.log("[Generate] Processing image...");
        let imageBuffer;
        if (Buffer.isBuffer(imageUrl)) {
          imageBuffer = imageUrl;
        } else if (imageUrl.startsWith("data:")) {
          const base64 = imageUrl.split(",")[1];
          imageBuffer = Buffer.from(base64, "base64");
        } else {
          const response = await axios.get(imageUrl, {
            responseType: "arraybuffer"
          });
          imageBuffer = Buffer.from(response.data);
        }
        formData.append("image", new Blob([imageBuffer]), "user-image");
      }
      formData.append("user_prompt", finalPrompt);
      formData.append("style_id", finalStyle);
      formData.append("quality", finalQuality);
      formData.append("generation_type", finalGenType);
      formData.append("user_id", userData.userId);
      formData.append("timestamp", userData.timestamp);
      formData.append("platform", userData.platform);
      formData.append("app_version", userData.appVersion);
      formData.append("locale", userData.locale);
      formData.append("is_pro_user", userData.isProUser);
      formData.append("daily_count", userData.dailyCount);
      if (userData.rcUserId) formData.append("rc_user_id", userData.rcUserId);
      if (userData.packageId) formData.append("package_id", userData.packageId);
      if (userData.deviceId) formData.append("device_id", userData.deviceId);
      console.log(`[Generate] Sending request with genType: ${finalGenType}...`);
      const {
        data
      } = await axios.post(`${this.config.base}${this.config.endpoint.generate}`, formData, {
        headers: {
          "x-api-key": this.config.key
        }
      });
      console.log("[Generate] Success!");
      return data;
    } catch (error) {
      console.error("[Generate] Error:", error?.message || error);
      throw error;
    }
  }
  async styles({
    platform,
    ...rest
  } = {}) {
    console.log("[Styles] Fetching styles...");
    try {
      const {
        data
      } = await axios.get(`${this.config.base}${this.config.endpoint.styles}`, {
        headers: {
          "x-api-key": this.config.key
        },
        params: {
          platform: platform || "nodejs"
        }
      });
      console.log("[Styles] Success! Count:", data?.styles?.length || 0);
      return data;
    } catch (error) {
      console.error("[Styles] Error:", error?.message || error);
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new CartoonyAPI();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        if (response.success && response.generatedImage && response.generatedImage.mimeType === "image/png" && response.generatedImage.data) {
          const buffer = Buffer.from(response.generatedImage.data, "base64");
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Content-Length", buffer.length);
          return res.send(buffer);
        } else {
          return res.status(200).json(response);
        }
      case "styles":
        response = await api.styles(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'generate', 'styles'.`
        });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}