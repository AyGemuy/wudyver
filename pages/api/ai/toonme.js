import axios from "axios";
import FormData from "form-data";
import {
  randomUUID
} from "crypto";
class ToonMaker {
  constructor() {
    this.userId = randomUUID();
    this.cfg = {
      base: "https://new-maketoon-754894832194.europe-west1.run.app",
      vid: "https://videogenerator-754894832194.europe-west1.run.app",
      fs: "https://firestore.googleapis.com/v1/projects/toonifymekmboile/databases/(default)/documents/config/aiModels",
      fsKey: "AIzaSyCbv5SaykNHGzNnOOZvDLV3ZyCRIzV3LEI",
      style: "https://api.thekmobile.com/services.json"
    };
    this.fallStyles = [{
      id: "anime",
      name: "Anime",
      isPro: false,
      icon: "assets/styles/anime.png"
    }, {
      id: "shonen",
      name: "Shonen",
      isPro: true,
      icon: "assets/styles/shonen.png"
    }, {
      id: "comic",
      name: "Comic Book",
      isPro: false,
      icon: "assets/styles/comic.png"
    }, {
      id: "game",
      name: "3D Game",
      isPro: true,
      icon: "assets/styles/game.png"
    }, {
      id: "clay",
      name: "Claymation",
      isPro: true,
      icon: "assets/styles/clay.png"
    }, {
      id: "stock",
      name: "Stock",
      isPro: false,
      icon: "assets/styles/stock.png"
    }, {
      id: "90s",
      name: "90s Retro",
      isPro: true,
      icon: "assets/styles/90s.png"
    }];
  }
  log(m) {
    console.log(`[ToonMaker] ${new Date().toLocaleTimeString()} | ${m}`);
  }
  fmtRes(success, data, message = "") {
    return {
      status: success ? "success" : "error",
      message: message,
      timestamp: new Date().toISOString(),
      ...data ? {
        ...data
      } : {}
    };
  }
  async solve(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string" && input.startsWith("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer",
          timeout: 0
        });
        return Buffer.from(res.data);
      }
      const b64 = input.includes("base64,") ? input.split("base64,")[1] : input;
      return Buffer.from(b64, "base64");
    } catch (e) {
      this.log(`Media Error: ${e.message}`);
      return null;
    }
  }
  async retry(fn, maxRetries = 3, baseDelay = 3e3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1e3;
        this.log(`Retry attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  async models({
    ...rest
  } = {}) {
    try {
      this.log("Fetching AI Models...");
      const res = await axios.get(`${this.cfg.fs}?key=${this.cfg.fsKey}`, {
        timeout: 0
      });
      const raw = res.data?.fields?.models?.arrayValue?.values || [];
      const models = raw.map(v => {
        const f = v.mapValue?.fields || {};
        return {
          id: f.id?.stringValue,
          name: f.name?.stringValue,
          resolution: f.capabilities?.mapValue?.fields?.resolution?.stringValue || "720p",
          ...rest
        };
      });
      return this.fmtRes(true, {
        models: models
      });
    } catch (e) {
      return this.fmtRes(false, null, e.message);
    }
  }
  async styles({
    ...rest
  } = {}) {
    try {
      this.log("Fetching Styles...");
      const res = await axios.get(this.cfg.style, {
        timeout: 0
      });
      const data = res.data?.styles || this.fallStyles;
      const styles = data.map(s => ({
        ...s,
        ...rest
      }));
      return this.fmtRes(true, {
        styles: styles
      });
    } catch (e) {
      return this.fmtRes(true, {
        styles: this.fallStyles
      }, "API Error, using fallback");
    }
  }
  async txt2img({
    prompt,
    ...rest
  } = {}) {
    if (!prompt) return this.fmtRes(false, null, "Parameter 'prompt' is required");
    try {
      this.log("Generating image from text...");
      const fd = new FormData();
      fd.append("prompt", prompt);
      const options = {
        model: rest.model || "replicate",
        user_id: rest.userId || this.userId,
        priority: rest.pro ? "high" : "normal",
        ...rest
      };
      for (const [key, val] of Object.entries(options)) {
        if (key === "refs" && val) {
          const refs = Array.isArray(val) ? val : [val];
          for (let i = 0; i < Math.min(refs.length, 6); i++) {
            const buf = await this.solve(refs[i]);
            if (buf) fd.append(i === 0 ? "image" : `image_${i}`, buf, `ref${i}.png`);
          }
        } else if (key !== "pro") {
          fd.append(key, String(val));
        }
      }
      const res = await axios.post(`${this.cfg.base}/text_to_image`, fd, {
        headers: fd.getHeaders(),
        timeout: 0
      });
      return this.fmtRes(true, res.data);
    } catch (e) {
      return this.fmtRes(false, null, e.message);
    }
  }
  async img2img({
    img,
    style,
    ...rest
  } = {}) {
    if (!img) return this.fmtRes(false, null, "Parameter 'img' is required");
    return await this.retry(async () => {
      try {
        this.log(`Converting image to style: ${style || "stock"}`);
        const buf = await this.solve(img);
        if (!buf) throw new Error("Invalid image input");
        const fd = new FormData();
        fd.append("image", buf, rest.name || "input.png");
        fd.append("style", style || "stock");
        fd.append("user_id", rest.userId || this.userId);
        const options = {
          priority: rest.pro ? "high" : "normal",
          user_tier: rest.tier || "free",
          remove_watermark: (rest.noWm || false).toString(),
          ...rest
        };
        Object.entries(options).forEach(([k, v]) => {
          if (!["pro", "tier", "noWm", "name", "userId"].includes(k)) {
            fd.append(k, String(v));
          }
        });
        const res = await axios.post(`${this.cfg.base}/transform_replicate`, fd, {
          headers: fd.getHeaders(),
          timeout: 0
        });
        return this.fmtRes(true, res.data);
      } catch (e) {
        this.log(`img2img error: ${e.message}`);
        throw e;
      }
    }, 3, 2e3);
  }
  async txt2vid({
    prompt,
    ...rest
  } = {}) {
    if (!prompt) return this.fmtRes(false, null, "Parameter 'prompt' is required");
    try {
      this.log("Generating video from text...");
      const payload = {
        userId: rest.userId || this.userId,
        type: "textToVideo",
        modelId: rest.modelId || "basic_v1",
        textPrompt: prompt,
        options: {
          maxDuration: rest.duration || 5,
          resolution: rest.res || "720p",
          style: rest.style || "cinematic",
          ...rest.options
        },
        ...rest
      };
      const res = await axios.post(`${this.cfg.vid}/textToVideo`, payload, {
        timeout: 0
      });
      return this.fmtRes(true, res.data);
    } catch (e) {
      return this.fmtRes(false, null, e.message);
    }
  }
  async img2vid({
    img,
    prompt,
    ...rest
  } = {}) {
    if (!img || !prompt) return this.fmtRes(false, null, "Parameters 'img' and 'prompt' are required");
    try {
      this.log("Generating video from image...");
      const buf = await this.solve(img);
      const payload = {
        userId: rest.userId || this.userId,
        type: "imageToVideo",
        modelId: rest.modelId || "basic_v1",
        imageData: buf?.toString("base64"),
        textPrompt: prompt,
        options: {
          maxDuration: rest.duration || 5,
          resolution: rest.res || "720p",
          style: rest.style || "cinematic",
          ...rest.options
        },
        ...rest
      };
      const res = await axios.post(`${this.cfg.vid}/imageToVideo`, payload, {
        timeout: 0
      });
      return this.fmtRes(true, res.data);
    } catch (e) {
      return this.fmtRes(false, null, e.message);
    }
  }
  async status({
    jobId,
    userId,
    ...rest
  } = {}) {
    if (!jobId) return this.fmtRes(false, null, "Parameter 'jobId' is required");
    try {
      const payload = {
        jobId: jobId,
        userId: userId || this.userId,
        ...rest
      };
      const res = await axios.post(`${this.cfg.vid}/getVideoStatus`, payload, {
        timeout: 0
      });
      return this.fmtRes(true, res.data);
    } catch (e) {
      return this.fmtRes(false, null, e.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const available_actions = ["models", "styles", "txt2img", "img2img", "txt2vid", "img2vid", "status"];
  if (!action) {
    return res.status(400).json({
      status: "error",
      error: "Action parameter is required",
      available_actions: available_actions
    });
  }
  const api = new ToonMaker();
  try {
    let response;
    switch (action.toLowerCase()) {
      case "models":
        response = await api.models(params);
        break;
      case "styles":
        response = await api.styles(params);
        break;
      case "txt2img":
        if (!params.prompt) return res.status(400).json({
          status: "error",
          error: "prompt is required"
        });
        response = await api.txt2img(params);
        break;
      case "img2img":
        if (!params.img) return res.status(400).json({
          status: "error",
          error: "img (URL/Base64) is required"
        });
        response = await api.img2img(params);
        break;
      case "txt2vid":
        if (!params.prompt) return res.status(400).json({
          status: "error",
          error: "prompt is required"
        });
        response = await api.txt2vid(params);
        break;
      case "img2vid":
        if (!params.img || !params.prompt) {
          return res.status(400).json({
            status: "error",
            error: "img and prompt are required"
          });
        }
        response = await api.img2vid(params);
        break;
      case "status":
        if (!params.jobId) return res.status(400).json({
          status: "error",
          error: "jobId is required"
        });
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          status: "error",
          error: `Unknown action: ${action}`,
          available_actions: available_actions
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[API Error] ${action}:`, error.message);
    return res.status(500).json({
      status: "error",
      action: action,
      error: error.message || "Internal server error"
    });
  }
}