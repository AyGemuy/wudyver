import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
const cookieStore = new Map();
const MODELS = {
  "hailuo-image-01": {
    id: "hailuo-image-01",
    modelId: "hailuo-image-01",
    modelPath: "minimax",
    label: "Hailuo Image 01",
    api: {
      "text-to-image": "fal-ai/minimax/image-01"
    },
    upgrade: false,
    credits: {
      "text-to-image": 1
    },
    description: "Longer text prompts will result in better quality images.",
    resolution: true
  },
  "flux-schnell": {
    id: "flux-schnell",
    modelId: "flux-schnell",
    modelPath: "flux",
    label: "Flux Schnell",
    api: {
      "text-to-image": "fal-ai/flux/schnell"
    },
    upgrade: false,
    credits: {
      "text-to-image": 0
    },
    description: "The fastest image generation model tailored for local development and personal use",
    resolution: true
  },
  "flux-dev": {
    id: "flux-dev",
    modelId: "flux-dev",
    modelPath: "flux",
    label: "Flux Dev",
    api: {
      "text-to-image": "fal-ai/flux/dev"
    },
    upgrade: false,
    credits: {
      "text-to-image": 1
    },
    description: "Cutting-edge output quality, second only to state-of-the-art model FLUX.1 [pro].",
    resolution: true
  },
  "flux-pro": {
    id: "flux-pro",
    modelId: "flux-pro",
    modelPath: "flux-pro",
    label: "Flux Pro",
    api: {
      "text-to-image": "fal-ai/flux-pro/v1.1",
      "image-to-image": "fal-ai/flux-pro/v1.1/redux"
    },
    upgrade: true,
    credits: {
      "text-to-image": 2
    },
    description: "Excellent image quality, prompt adherence, and output diversity.",
    resolution: true
  },
  "imagen-4": {
    id: "imagen-4",
    modelId: "imagen-4",
    modelPath: "imagen4",
    label: "Imagen 4",
    api: {
      "text-to-image": "fal-ai/imagen4/preview"
    },
    upgrade: true,
    credits: {
      "text-to-image": 1
    },
    description: "Google's highest quality image generation model",
    resolution: true
  },
  "ideogram-v3": {
    id: "ideogram-v3",
    modelId: "ideogram-v3",
    modelPath: "ideogram",
    label: "Ideogram V3",
    api: {
      "text-to-image": "fal-ai/ideogram/v3"
    },
    upgrade: true,
    credits: {
      "text-to-image": 2
    },
    description: "Generate high-quality images, posters, and logos",
    resolution: true
  },
  "recraft-v3": {
    id: "recraft-v3",
    modelId: "recraft-v3",
    modelPath: "recraft",
    label: "Recraft V3",
    api: {
      "text-to-image": "fal-ai/recraft/v3/text-to-image"
    },
    upgrade: true,
    credits: {
      "text-to-image": 2
    },
    description: "Generate long texts, vector art, images in brand style, and much more.",
    resolution: true
  }
};

function findModel(identifier) {
  if (!identifier) return null;
  const lowerIdentifier = identifier.toLowerCase();
  if (MODELS[lowerIdentifier]) {
    return MODELS[lowerIdentifier];
  }
  for (const model of Object.values(MODELS)) {
    if (model.modelId.toLowerCase() === lowerIdentifier) {
      return model;
    }
  }
  for (const model of Object.values(MODELS)) {
    if (model.modelPath.toLowerCase() === lowerIdentifier) {
      return model;
    }
  }
  for (const model of Object.values(MODELS)) {
    if (model.label.toLowerCase().includes(lowerIdentifier) || lowerIdentifier.includes(model.label.toLowerCase())) {
      return model;
    }
  }
  for (const model of Object.values(MODELS)) {
    if (model.id.toLowerCase().includes(lowerIdentifier) || model.modelId.toLowerCase().includes(lowerIdentifier) || model.modelPath.toLowerCase().includes(lowerIdentifier) || model.label.toLowerCase().includes(lowerIdentifier)) {
      return model;
    }
  }
  return null;
}
const createAxiosInstance = (baseConfig = {}) => {
  const instance = axios.create({
    ...baseConfig,
    withCredentials: true
  });
  instance.interceptors.request.use(config => {
    const url = new URL(config.url, config.baseURL);
    const domain = url.hostname;
    const cookies = [];
    for (const [name, cookieData] of cookieStore.entries()) {
      if (domain.includes(cookieData.domain) || cookieData.domain.includes(domain)) {
        cookies.push(`${name}=${cookieData.value}`);
      }
    }
    if (cookies.length > 0) {
      config.headers.Cookie = cookies.join("; ");
    }
    console.log(`[REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
    if (cookies.length > 0) {
      console.log(`[COOKIES] ${config.headers.Cookie}`);
    }
    return config;
  });
  instance.interceptors.response.use(response => {
    const setCookieHeaders = response.headers["set-cookie"];
    if (setCookieHeaders) {
      setCookieHeaders.forEach(cookieHeader => {
        const cookieParts = cookieHeader.split(";");
        const [nameValue] = cookieParts;
        const [name, value] = nameValue.split("=");
        if (name && value) {
          const domainMatch = cookieHeader.match(/Domain=([^;]+)/i);
          const pathMatch = cookieHeader.match(/Path=([^;]+)/i);
          cookieStore.set(name, {
            value: value,
            domain: domainMatch ? domainMatch[1].trim() : response.config.baseURL?.replace(/https?:\/\//, "") || "magi-1.video",
            path: pathMatch ? pathMatch[1].trim() : "/",
            expires: new Date(Date.now() + 24 * 60 * 60 * 1e3)
          });
          console.log(`[COOKIE-SET] ${name}=${value}`);
        }
      });
    }
    return response;
  }, error => {
    if (error.response?.headers?.["set-cookie"]) {
      error.response.headers["set-cookie"].forEach(cookieHeader => {
        const cookieParts = cookieHeader.split(";");
        const [nameValue] = cookieParts;
        const [name, value] = nameValue.split("=");
        if (name && value) {
          cookieStore.set(name, {
            value: value,
            domain: "magi-1.video",
            path: "/",
            expires: new Date(Date.now() + 24 * 60 * 60 * 1e3)
          });
        }
      });
    }
    return Promise.reject(error);
  });
  return instance;
};
class MagiVideo {
  constructor() {
    this.api = createAxiosInstance({
      baseURL: "https://magi-1.video",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://magi-1.video",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://magi-1.video/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.isAuthenticated = false;
    this.sessionToken = null;
  }
  listModels() {
    console.log("\n📋 AVAILABLE MODELS:");
    console.log("=".repeat(80));
    Object.values(MODELS).forEach((model, index) => {
      console.log(`\n${index + 1}. ${model.label} (${model.modelId})`);
      console.log(`   📝 Description: ${model.description}`);
      console.log(`   🔧 Model Path: ${model.modelPath}`);
      console.log(`   💰 Credits: ${model.credits["text-to-image"]}`);
      console.log(`   🆓 Free: ${!model.upgrade}`);
      console.log(`   🆔 ID: ${model.id}`);
    });
    console.log("\n💡 Usage: You can use model ID, modelId, modelPath, or label name");
    console.log('   Example: "flux-schnell", "flux", "Flux Schnell", "schnell"');
  }
  validateModel(modelIdentifier) {
    const model = findModel(modelIdentifier);
    if (!model) {
      console.log("\n❌ Model not found! Available models:");
      this.listModels();
      throw new Error(`Model "${modelIdentifier}" not found. Please choose from available models.`);
    }
    console.log(`\n✅ Selected model: ${model.label} (${model.modelId})`);
    console.log(`   📝 ${model.description}`);
    return model;
  }
  generateRandomEmail() {
    const uuid = crypto.randomUUID();
    return `${uuid}@emailhook.site`;
  }
  generateRandomUsername() {
    const adjectives = ["Swift", "Bright", "Cool", "Fast", "Smart", "Quick", "Sharp", "Bold"];
    const nouns = ["Tiger", "Eagle", "Wolf", "Lion", "Hawk", "Fox", "Bear", "Shark"];
    const randomNum = Math.floor(Math.random() * 1e3);
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}${noun}${randomNum}`;
  }
  generateRandomPassword() {
    return crypto.randomBytes(12).toString("hex");
  }
  async signup() {
    try {
      const email = this.generateRandomEmail();
      const username = this.generateRandomUsername();
      const password = this.generateRandomPassword();
      console.log(`[SIGNUP] Creating account: ${email}, ${username}`);
      const response = await this.api.post("/api/auth/signup", {
        email: email,
        username: username,
        password: password
      });
      console.log("[SIGNUP] Account created successfully");
      this.isAuthenticated = true;
      return {
        email: email,
        username: username,
        password: password,
        response: response.data
      };
    } catch (error) {
      console.error("[SIGNUP] Error:", error.response?.data || error.message);
      throw error;
    }
  }
  async generate({
    prompt,
    model = "minimax",
    ...rest
  }) {
    try {
      if (!this.isAuthenticated) {
        await this.signup();
      }
      const modelConfig = this.validateModel(model);
      console.log(`[GENERATE] Creating image with prompt: ${prompt}`);
      console.log(`[GENERATE] Using model: ${modelConfig.label}`);
      const payload = {
        type: "text-to-image",
        apiName: "genImage",
        modelPath: modelConfig.modelPath,
        modelId: modelConfig.modelId,
        modelAPI: modelConfig.api["text-to-image"],
        aspect_ratio: rest.aspect_ratio || "3:4",
        image_url: "",
        input_image_urls: null,
        input: {
          prompt: prompt,
          aspect_ratio: rest.aspect_ratio || "3:4",
          image_size: rest.image_size || "3:4",
          num_images: rest.num_images || 1
        },
        isPublic: true,
        webhookUrl: "https://magi-1.video/api/fal/webhook_image",
        ...rest
      };
      const response = await this.api.post("/api/fal/genImage", payload);
      const requestId = response.data.request_id;
      console.log(`[GENERATE] Task created: ${requestId}`);
      console.log(`[GENERATE] Status: ${response.data.status}`);
      return await this.pollTaskStatus(requestId, modelConfig.modelPath);
    } catch (error) {
      console.error("[GENERATE] Error:", error.response?.data || error.message);
      throw error;
    }
  }
  async pollTaskStatus(requestId, modelPath, maxAttempts = 60, interval = 3e3) {
    console.log(`[POLL] Starting polling for task: ${requestId}`);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, interval));
        const response = await this.api.get(`/api/fal/genImage/${requestId}?modelPath=${modelPath}`);
        const status = response.data.status;
        console.log(`[POLL] Attempt ${attempt}: Status = ${status}`);
        if (status === "COMPLETED") {
          console.log("[POLL] Task completed successfully");
          return response.data;
        } else if (status === "FAILED") {
          throw new Error("Task failed");
        }
      } catch (error) {
        console.error(`[POLL] Error on attempt ${attempt}:`, error.message);
        if (attempt === maxAttempts) {
          throw new Error(`Polling failed after ${maxAttempts} attempts`);
        }
      }
    }
    throw new Error("Max polling attempts reached");
  }
  getCookies() {
    const cookies = {};
    for (const [name, data] of cookieStore.entries()) {
      cookies[name] = data.value;
    }
    return cookies;
  }
  clearCookies() {
    cookieStore.clear();
    console.log("[COOKIES] All cookies cleared");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const magi = new MagiVideo();
    const response = await magi.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}