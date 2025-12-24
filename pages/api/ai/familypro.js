import axios from "axios";
import https from "https";
import crypto from "crypto";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class FamilyProAI {
  constructor() {
    this.base = "https://familypro.io";
    this.auth = null;
    this.agent = new https.Agent({
      rejectUnauthorized: false
    });
    this.config = {
      nano_banana: {
        type: "form",
        field: "reference_images",
        required: ["prompt", "imageUrl"],
        defaults: {
          prompt: "Edit image with AI"
        },
        description: "AI image editor - add objects, change styles",
        example: {
          tool: "nano_banana",
          prompt: "Add hat",
          imageUrl: "https://..."
        }
      },
      ai_character_generator: {
        type: "form",
        field: "input_image",
        required: ["imageUrl"],
        defaults: {
          style: "Random",
          persona: "None"
        },
        description: "Generate AI character from photo",
        example: {
          tool: "ai_character_generator",
          imageUrl: "https://...",
          style: "Anime"
        }
      },
      deepseek: {
        type: "json",
        field: null,
        required: ["prompt"],
        defaults: {
          convKey: "",
          prompt: "Hello, how can I help you?"
        },
        description: "Chat with DeepSeek AI",
        example: {
          tool: "deepseek",
          prompt: "Tell me a joke"
        }
      },
      image_upscale: {
        type: "form",
        field: "up_img",
        required: ["imageUrl"],
        defaults: {},
        description: "Upscale and unblur images",
        example: {
          tool: "image_upscale",
          imageUrl: "https://..."
        }
      }
    };
  }
  listTools() {
    return Object.entries(this.config).map(([name, cfg]) => ({
      tool: name,
      description: cfg.description,
      required: cfg.required,
      defaults: cfg.defaults,
      example: cfg.example
    }));
  }
  validate(tool, params) {
    const errors = [];
    if (!tool) {
      return {
        valid: false,
        error: "Tool is required",
        available: this.listTools()
      };
    }
    const cfg = this.config[tool];
    if (!cfg) {
      return {
        valid: false,
        error: `Unknown tool: "${tool}"`,
        available: this.listTools()
      };
    }
    for (const req of cfg.required || []) {
      const val = params[req] || params.images;
      if (!val || Array.isArray(val) && val.length === 0) {
        errors.push(`Missing required field: "${req}"`);
      }
    }
    if (errors.length > 0) {
      return {
        valid: false,
        errors: errors,
        required: cfg.required,
        defaults: cfg.defaults,
        example: cfg.example
      };
    }
    return {
      valid: true
    };
  }
  randId() {
    const parts = ["Mozilla/5.0", "Linux", "Android 10", "K", "AppleWebKit/537.36", "Chrome/127.0.0.0", "Safari/537.36", "id-ID", String(crypto.randomInt(1e3, 9999)), String(crypto.randomInt(1e4, 99999)), String(crypto.randomInt(100, 999))];
    let id = parts.join(";").replace(/[^a-zA-Z0-9]/g, "");
    if (id.length > 100) {
      id = id.substring(0, 100);
    }
    return id;
  }
  headers(opts = {}) {
    const h = {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: "https://familypro.io",
      referer: opts.ref || "https://familypro.io/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      ...SpoofHead()
    };
    if (opts.ct) h["content-type"] = opts.ct;
    if (this.auth) h["guest-authorization"] = this.auth;
    return h;
  }
  async login(tool) {
    try {
      console.log("🔑 Logging in...");
      const deviceId = this.randId();
      const form = new FormData();
      form.append("device_id", deviceId);
      console.log("📤 Device ID:", deviceId);
      const res = await axios.post(`${this.base}/api/ai-task/guest_login`, form, {
        headers: {
          ...this.headers(),
          ...form.getHeaders()
        },
        httpsAgent: this.agent
      });
      console.log("📥 Login response:", JSON.stringify(res.data, null, 2));
      const headerToken = res.headers?.["x-guest-token"] || res.headers?.["X-Guest-Token"];
      if (headerToken) {
        this.auth = headerToken;
        console.log(`✅ Logged in via header: ${this.auth.substring(0, 20)}...`);
      } else if (res.data?.data?.guest_authorization) {
        this.auth = res.data.data.guest_authorization;
        console.log(`✅ Logged in via body: ${this.auth.substring(0, 20)}...`);
      } else if (res.data?.code === 1e5) {
        this.auth = deviceId;
        console.log(`⚠️ No token received, using device_id as auth`);
      } else {
        throw new Error("No authentication token received");
      }
      return res.data;
    } catch (err) {
      console.error("❌ Login failed:", err.message);
      if (err.response) {
        console.error("📥 Error response:", JSON.stringify(err.response.data, null, 2));
      }
      throw err;
    }
  }
  async imgToBuffer(img) {
    if (!img) return null;
    try {
      if (Buffer.isBuffer(img)) return img;
      if (img.startsWith("data:")) {
        const b64 = img.split(",")[1] || img;
        return Buffer.from(b64, "base64");
      }
      if (img.startsWith("http")) {
        const {
          data
        } = await axios.get(img, {
          responseType: "arraybuffer",
          httpsAgent: this.agent
        });
        return Buffer.from(data);
      }
      return Buffer.from(img, "base64");
    } catch (err) {
      console.error("⚠️ Image conversion failed:", err.message);
      return null;
    }
  }
  async make(tool, params) {
    try {
      if (!this.auth) await this.login(tool);
      console.log(`🚀 Creating ${tool} task...`);
      const cfg = this.config[tool];
      const url = `${this.base}/api/ai-task/make/${tool}`;
      const payload = {
        ...cfg.defaults,
        ...params
      };
      let res;
      if (cfg.type === "json") {
        const body = {
          conversion_key: payload.convKey || cfg.defaults.convKey || "",
          user_question: payload.prompt || cfg.defaults.prompt
        };
        console.log("📤 Request payload:", JSON.stringify(body, null, 2));
        res = await axios.post(url, body, {
          headers: this.headers({
            ct: "application/json"
          }),
          httpsAgent: this.agent
        });
      } else {
        const form = new FormData();
        if (tool === "nano_banana") {
          form.append("prompt", payload.prompt || cfg.defaults.prompt);
          console.log("📤 Form data: prompt =", payload.prompt || cfg.defaults.prompt);
        } else if (tool === "ai_character_generator") {
          form.append("style", payload.style || cfg.defaults.style);
          form.append("persona", payload.persona || cfg.defaults.persona);
          console.log("📤 Form data: style =", payload.style || cfg.defaults.style, ", persona =", payload.persona || cfg.defaults.persona);
        }
        const imgs = Array.isArray(payload.images) ? payload.images : payload.imageUrl ? [payload.imageUrl] : [];
        console.log(`📤 Images to process: ${imgs.length}`);
        for (let i = 0; i < imgs.length; i++) {
          const buf = await this.imgToBuffer(imgs[i]);
          if (buf) {
            const ext = imgs[i]?.includes?.("png") ? "png" : "jpg";
            form.append(cfg.field, buf, {
              filename: `image-${Date.now()}-${i}.${ext}`,
              contentType: `image/${ext === "png" ? "png" : "jpeg"}`
            });
            console.log(`   ✓ Image ${i + 1} added (${buf.length} bytes)`);
          }
        }
        res = await axios.post(url, form, {
          headers: {
            ...this.headers(),
            ...form.getHeaders()
          },
          httpsAgent: this.agent
        });
      }
      console.log("📥 Make task response:", JSON.stringify(res?.data, null, 2));
      const pollUrl = res?.data?.data?.polling_ai_task_url;
      console.log(`✅ Task created: ${pollUrl?.split("/").pop()}`);
      return res?.data;
    } catch (err) {
      console.error("❌ Make task failed:", err.message);
      throw err;
    }
  }
  async poll(url, max = 60, delay = 3e3) {
    try {
      console.log("⏳ Polling task...");
      for (let i = 1; i <= max; i++) {
        const {
          data
        } = await axios.get(url, {
          headers: this.headers(),
          httpsAgent: this.agent
        });
        const status = data?.task_status;
        console.log(`🔄 [${i}/${max}] Status: ${status || "checking"}`);
        if (i === 1 || status === "succeed" || status === "failed" || status === "processing" && data?.data?.stream_url) {
          console.log("📥 Poll response:", JSON.stringify(data, null, 2));
        }
        if (status === "succeed") {
          console.log("🎉 Task completed!");
          return data;
        }
        if (status === "failed") {
          throw new Error("Task failed");
        }
        if (status === "processing" && data?.data?.stream_url) {
          console.log("📡 Streaming response detected");
          const stream = await this.stream(data.data.stream_url);
          return {
            ...data,
            streamData: stream
          };
        }
        await new Promise(r => setTimeout(r, delay));
      }
      throw new Error("Polling timeout");
    } catch (err) {
      console.error("❌ Polling failed:", err.message);
      throw err;
    }
  }
  async stream(url) {
    try {
      console.log("📥 Fetching stream...");
      const {
        data
      } = await axios.get(url, {
        headers: {
          accept: "*/*",
          origin: "https://familypro.io",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        },
        httpsAgent: this.agent
      });
      console.log("📥 Stream response:", JSON.stringify(data, null, 2));
      console.log("✅ Stream data received");
      return data;
    } catch (err) {
      console.error("❌ Stream failed:", err.message);
      return null;
    }
  }
  async generate({
    tool,
    prompt,
    imageUrl,
    images,
    style,
    persona,
    convKey,
    ...rest
  }) {
    try {
      const validation = this.validate(tool, {
        prompt: prompt,
        imageUrl: imageUrl,
        images: images
      });
      if (!validation.valid) {
        console.error("❌ Validation failed:");
        console.error(JSON.stringify(validation, null, 2));
        return {
          success: false,
          validation: validation
        };
      }
      console.log("\n" + "=".repeat(50));
      console.log(`🎨 Generating with ${tool}`);
      console.log("=".repeat(50) + "\n");
      const params = {
        prompt: prompt,
        imageUrl: imageUrl,
        images: images || (imageUrl ? [imageUrl] : []),
        style: style,
        persona: persona,
        convKey: convKey,
        ...rest
      };
      const makeRes = await this.make(tool, params);
      const pollUrl = makeRes?.data?.polling_ai_task_url;
      if (!pollUrl) {
        throw new Error("No polling URL received");
      }
      const result = await this.poll(pollUrl);
      console.log("\n" + "=".repeat(50));
      console.log("✨ Generation complete!");
      console.log("📥 Final result:", JSON.stringify(result, null, 2));
      console.log("=".repeat(50) + "\n");
      let output = result?.data?.output;
      if (result?.streamData) {
        output = result.streamData;
      }
      if (Array.isArray(output) && output.length > 0) {
        output = output;
      }
      return {
        success: true,
        output: output,
        isStreaming: !!result?.streamData,
        taskStatus: result?.task_status,
        data: result
      };
    } catch (err) {
      console.error("❌ Generation failed:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const api = new FamilyProAI();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}