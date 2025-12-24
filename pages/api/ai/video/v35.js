import fetch from "node-fetch";
import {
  Agent as HttpsAgent
} from "https";
import FormData from "form-data";
const httpsAgent = new HttpsAgent({
  keepAlive: true
});
const MAX_ATTEMPTS = 3;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal download gambar: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getFilenameFromUrl(url) {
  try {
    return url.split("/").pop().split("?")[0] || "image.jpg";
  } catch {
    return "image.jpg";
  }
}
class PolloAIService {
  constructor({
    apiKey = null
  }) {
    this.apiKey = apiKey || "pollo_xyxDjNpJEjVn8VF4LZisv05OknHJLFn0qHbP1Si4Ga8u";
    this.config = {
      endpoint: "https://pollo.ai/api/platform",
      defaultHeaders: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey
      }
    };
  }
  setApiKey(apiKey) {
    this.apiKey = apiKey;
    this.config.defaultHeaders["x-api-key"] = apiKey;
  }
  _validateRequired(obj, fields) {
    const errors = [];
    for (const field of fields) {
      if (obj[field] === undefined || obj[field] === null || obj[field] === "") {
        errors.push({
          field: field,
          message: `Parameter '${field}' wajib diisi.`,
          type: "required"
        });
      }
    }
    return errors;
  }
  _validateEnum(value, field, allowed) {
    const errors = [];
    if (value !== undefined && value !== null && value !== "") {
      if (!allowed.includes(value)) {
        errors.push({
          field: field,
          message: `Parameter '${field}' harus salah satu dari: ${allowed.join(", ")}`,
          type: "invalid_enum"
        });
      }
    }
    return errors;
  }
  async _resolveImage(imageInput) {
    if (!imageInput) return null;
    let buffer, filename = "image.jpg";
    if (typeof imageInput === "string") {
      if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
        buffer = await downloadImage(imageInput);
        filename = getFilenameFromUrl(imageInput);
      } else if (imageInput.startsWith("data:")) {
        const matches = imageInput.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches) throw new Error("Format base64 tidak valid");
        buffer = Buffer.from(matches[2], "base64");
        filename = `image.${matches[1].split("/")[1] || "png"}`;
      } else {
        buffer = Buffer.from(imageInput, "base64");
      }
    } else if (Buffer.isBuffer(imageInput)) {
      buffer = imageInput;
    } else {
      throw new Error("image harus string (URL/base64) atau Buffer");
    }
    return {
      buffer: buffer,
      filename: filename
    };
  }
  async _attemptReq(params, attempt = 1) {
    const {
      path,
      method,
      data
    } = params;
    const url = `${this.config.endpoint}${path}`;
    let response, responseText;
    try {
      const options = {
        method: method,
        headers: {
          ...this.config.defaultHeaders
        },
        agent: httpsAgent
      };
      if (data) {
        options.body = JSON.stringify(data);
      }
      console.log(`[POLLO_API_REQ] ${method} ${url} (Attempt ${attempt})`);
      response = await fetch(url, options);
      responseText = await response.text();
      if (!response.ok) {
        if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
          await sleep(attempt * 1e3);
          return await this._attemptReq(params, attempt + 1);
        }
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }
      try {
        return JSON.parse(responseText);
      } catch {
        return {
          raw: responseText
        };
      }
    } catch (error) {
      const isNetwork = /fetch|ECONN|EHOST/.test(error.message);
      if (isNetwork && attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 1e3);
        return await this._attemptReq(params, attempt + 1);
      }
      throw error;
    }
  }
  async getBalance() {
    return await this._attemptReq({
      method: "GET",
      path: "/credit/balance"
    });
  }
  async polloGeneration({
    image,
    imageTail,
    prompt,
    resolution = "480p",
    mode = "basic",
    length = 5,
    seed = 123,
    webhookUrl = ""
  }) {
    const errors = this._validateRequired({
      prompt: prompt
    }, ["prompt"]);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
    this._validateEnum(resolution, "resolution", ["480p", "720p", "1080p"]);
    this._validateEnum(mode, "mode", ["basic", "advanced"]);
    const input = {
      prompt: prompt,
      resolution: resolution,
      mode: mode,
      length: length,
      seed: seed
    };
    if (image) input.image = image;
    if (imageTail) input.imageTail = imageTail;
    const data = {
      input: input
    };
    if (webhookUrl) data.webhookUrl = webhookUrl;
    return await this._attemptReq({
      method: "POST",
      path: "/generation/pollo/pollo-v1-6",
      data: data
    });
  }
  async klingGeneration({
    image,
    prompt,
    negativePrompt = "",
    strength = 50,
    length = 5,
    mode = "std",
    webhookUrl = ""
  }) {
    const errors = this._validateRequired({
      image: image,
      prompt: prompt
    }, ["image", "prompt"]);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
    this._validateEnum(mode, "mode", ["std", "fast"]);
    const input = {
      image: image,
      prompt: prompt,
      strength: strength,
      length: length,
      mode: mode
    };
    if (negativePrompt) input.negativePrompt = negativePrompt;
    const data = {
      input: input
    };
    if (webhookUrl) data.webhookUrl = webhookUrl;
    return await this._attemptReq({
      method: "POST",
      path: "/generation/kling-ai/kling-v2-5-turbo",
      data: data
    });
  }
  async soraGeneration({
    image,
    prompt,
    length = 4,
    aspectRatio = "16:9",
    resolution = "1080p",
    webhookUrl = ""
  }) {
    const errors = this._validateRequired({
      prompt: prompt
    }, ["prompt"]);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
    this._validateEnum(aspectRatio, "aspectRatio", ["16:9", "9:16", "1:1", "4:3"]);
    this._validateEnum(resolution, "resolution", ["480p", "720p", "1080p"]);
    const input = {
      prompt: prompt,
      length: length,
      aspectRatio: aspectRatio,
      resolution: resolution
    };
    if (image) input.image = image;
    const data = {
      input: input
    };
    if (webhookUrl) data.webhookUrl = webhookUrl;
    return await this._attemptReq({
      method: "POST",
      path: "/generation/sora/sora-2-pro",
      data: data
    });
  }
  async runwayGeneration({
    image,
    prompt,
    length = 5,
    aspectRatio = "16:9",
    seed = 123,
    webhookUrl = ""
  }) {
    const errors = this._validateRequired({
      image: image,
      prompt: prompt
    }, ["image", "prompt"]);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
    this._validateEnum(aspectRatio, "aspectRatio", ["16:9", "9:16", "1:1", "4:3"]);
    const input = {
      image: image,
      prompt: prompt,
      length: length,
      aspectRatio: aspectRatio,
      seed: seed
    };
    const data = {
      input: input
    };
    if (webhookUrl) data.webhookUrl = webhookUrl;
    return await this._attemptReq({
      method: "POST",
      path: "/generation/runway/runway-gen-4-turbo",
      data: data
    });
  }
  async pixverseGeneration({
    image,
    imageTail,
    prompt,
    length = 5,
    negativePrompt = "",
    seed = 123,
    resolution = "360p",
    style = "auto",
    webhookUrl = ""
  }) {
    const errors = this._validateRequired({
      prompt: prompt
    }, ["prompt"]);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
    this._validateEnum(resolution, "resolution", ["360p", "480p", "720p", "1080p"]);
    this._validateEnum(style, "style", ["auto", "realistic", "anime", "cinematic"]);
    const input = {
      prompt: prompt,
      length: length,
      resolution: resolution,
      style: style
    };
    if (image) input.image = image;
    if (imageTail) input.imageTail = imageTail;
    if (negativePrompt) input.negativePrompt = negativePrompt;
    if (seed) input.seed = seed;
    const data = {
      input: input
    };
    if (webhookUrl) data.webhookUrl = webhookUrl;
    return await this._attemptReq({
      method: "POST",
      path: "/generation/pixverse/pixverse-v5",
      data: data
    });
  }
  async veoGeneration({
    images = [],
    prompt,
    resolution = "720p",
    seed = 123,
    generateAudio = true,
    webhookUrl = ""
  }) {
    const errors = this._validateRequired({
      prompt: prompt
    }, ["prompt"]);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
    this._validateEnum(resolution, "resolution", ["480p", "720p", "1080p"]);
    const input = {
      images: images,
      prompt: prompt,
      resolution: resolution,
      generateAudio: generateAudio
    };
    if (seed) input.seed = seed;
    const data = {
      input: input
    };
    if (webhookUrl) data.webhookUrl = webhookUrl;
    return await this._attemptReq({
      method: "POST",
      path: "/generation/google/veo3-1",
      data: data
    });
  }
  async pikaGeneration({
    image,
    prompt,
    negativePrompt = "",
    seed = 123,
    resolution = "720p",
    length = 5,
    webhookUrl = ""
  }) {
    const errors = this._validateRequired({
      image: image,
      prompt: prompt
    }, ["image", "prompt"]);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
    this._validateEnum(resolution, "resolution", ["480p", "720p", "1080p"]);
    const input = {
      image: image,
      prompt: prompt,
      resolution: resolution,
      length: length
    };
    if (negativePrompt) input.negativePrompt = negativePrompt;
    if (seed) input.seed = seed;
    const data = {
      input: input
    };
    if (webhookUrl) data.webhookUrl = webhookUrl;
    return await this._attemptReq({
      method: "POST",
      path: "/generation/pika/pika-v2-2",
      data: data
    });
  }
  async minimaxGeneration({
    image,
    prompt,
    promptOptimizer = true,
    resolution = "768P",
    length = 6,
    webhookUrl = ""
  }) {
    const errors = this._validateRequired({
      image: image,
      prompt: prompt
    }, ["image", "prompt"]);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
    this._validateEnum(resolution, "resolution", ["768P", "1080P"]);
    const input = {
      image: image,
      prompt: prompt,
      promptOptimizer: promptOptimizer,
      resolution: resolution,
      length: length
    };
    const data = {
      input: input
    };
    if (webhookUrl) data.webhookUrl = webhookUrl;
    return await this._attemptReq({
      method: "POST",
      path: "/generation/minimax/minimax-hailuo-2.3-fast",
      data: data
    });
  }
  async viduGeneration({
    prompt,
    image,
    imageTail,
    movementAmplitude = "auto",
    length = 5,
    resolution = "720p",
    seed = 123,
    generateAudio = true,
    webhookUrl = ""
  }) {
    const errors = this._validateRequired({
      prompt: prompt
    }, ["prompt"]);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
    this._validateEnum(resolution, "resolution", ["480p", "720p", "1080p"]);
    this._validateEnum(movementAmplitude, "movementAmplitude", ["auto", "low", "medium", "high"]);
    const input = {
      prompt: prompt,
      length: length,
      resolution: resolution,
      generateAudio: generateAudio
    };
    if (image) input.image = image;
    if (imageTail) input.imageTail = imageTail;
    if (movementAmplitude) input.movementAmplitude = movementAmplitude;
    if (seed) input.seed = seed;
    const data = {
      input: input
    };
    if (webhookUrl) data.webhookUrl = webhookUrl;
    return await this._attemptReq({
      method: "POST",
      path: "/generation/vidu/viduq2-pro",
      data: data
    });
  }
  async lumaGeneration({
    prompt,
    resolution = "540p",
    length = 5,
    aspectRatio = "16:9",
    imageTail,
    image,
    webhookUrl = ""
  }) {
    const errors = this._validateRequired({
      prompt: prompt
    }, ["prompt"]);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
    this._validateEnum(resolution, "resolution", ["540p", "720p", "1080p"]);
    this._validateEnum(aspectRatio, "aspectRatio", ["16:9", "9:16", "1:1", "4:3"]);
    const input = {
      prompt: prompt,
      resolution: resolution,
      length: length,
      aspectRatio: aspectRatio
    };
    if (image) input.image = image;
    if (imageTail) input.imageTail = imageTail;
    const data = {
      input: input
    };
    if (webhookUrl) data.webhookUrl = webhookUrl;
    return await this._attemptReq({
      method: "POST",
      path: "/generation/luma/luma-ray-2-0-flash",
      data: data
    });
  }
  async wanxGeneration({
    image,
    prompt,
    negativePrompt = "",
    length = 5,
    resolution = "1080P",
    aspectRatio = "16:9",
    seed = 123,
    audioUrl = "",
    wanAudio = true,
    webhookUrl = ""
  }) {
    const errors = this._validateRequired({
      image: image,
      prompt: prompt
    }, ["image", "prompt"]);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
    this._validateEnum(resolution, "resolution", ["480P", "720P", "1080P"]);
    this._validateEnum(aspectRatio, "aspectRatio", ["16:9", "9:16", "1:1", "4:3"]);
    const input = {
      image: image,
      prompt: prompt,
      length: length,
      resolution: resolution,
      aspectRatio: aspectRatio,
      wanAudio: wanAudio
    };
    if (negativePrompt) input.negativePrompt = negativePrompt;
    if (seed) input.seed = seed;
    if (audioUrl) input.audioUrl = audioUrl;
    const data = {
      input: input
    };
    if (webhookUrl) data.webhookUrl = webhookUrl;
    return await this._attemptReq({
      method: "POST",
      path: "/generation/wanx/wan-v2-5-preview",
      data: data
    });
  }
  async bytedanceGeneration({
    image,
    prompt,
    resolution = "480p",
    length = 5,
    aspectRatio = "16:9",
    seed = 123,
    cameraFixed = false,
    webhookUrl = ""
  }) {
    const errors = this._validateRequired({
      image: image,
      prompt: prompt
    }, ["image", "prompt"]);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
    this._validateEnum(resolution, "resolution", ["480p", "720p", "1080p"]);
    this._validateEnum(aspectRatio, "aspectRatio", ["16:9", "9:16", "1:1", "4:3"]);
    const input = {
      image: image,
      prompt: prompt,
      resolution: resolution,
      length: length,
      aspectRatio: aspectRatio,
      cameraFixed: cameraFixed
    };
    if (seed) input.seed = seed;
    const data = {
      input: input
    };
    if (webhookUrl) data.webhookUrl = webhookUrl;
    return await this._attemptReq({
      method: "POST",
      path: "/generation/bytedance/seedance-pro-fast",
      data: data
    });
  }
  async hunyuanGeneration({
    image,
    prompt,
    negativePrompt = "",
    length = 5,
    mode = "fast",
    soundEffects = true,
    webhookUrl = ""
  }) {
    const errors = this._validateRequired({
      image: image,
      prompt: prompt
    }, ["image", "prompt"]);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
    this._validateEnum(mode, "mode", ["fast", "standard", "high_quality"]);
    const input = {
      image: image,
      prompt: prompt,
      length: length,
      mode: mode,
      soundEffects: soundEffects
    };
    if (negativePrompt) input.negativePrompt = negativePrompt;
    const data = {
      input: input
    };
    if (webhookUrl) data.webhookUrl = webhookUrl;
    return await this._attemptReq({
      method: "POST",
      path: "/generation/hunyuan/hunyuan",
      data: data
    });
  }
  async getTaskStatus({
    taskId
  }) {
    const errors = this._validateRequired({
      taskId: taskId
    }, ["taskId"]);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
    return await this._attemptReq({
      method: "GET",
      path: `/generation/${taskId}/status`
    });
  }
}
const ACTION_MAP = {
  balance: "getBalance",
  pollo: "polloGeneration",
  kling: "klingGeneration",
  sora: "soraGeneration",
  runway: "runwayGeneration",
  pixverse: "pixverseGeneration",
  veo: "veoGeneration",
  pika: "pikaGeneration",
  minimax: "minimaxGeneration",
  vidu: "viduGeneration",
  luma: "lumaGeneration",
  wanx: "wanxGeneration",
  bytedance: "bytedanceGeneration",
  hunyuan: "hunyuanGeneration",
  status: "getTaskStatus"
};
const VALID_ACTIONS = Object.keys(ACTION_MAP);
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const apiMethodName = ACTION_MAP[action];
  if (!apiMethodName) {
    return res.status(400).json({
      error: `Action tidak valid: ${action}`,
      message: `Harap gunakan salah satu action berikut: ${VALID_ACTIONS.join(", ")}`,
      valid_actions: VALID_ACTIONS
    });
  }
  const api = new PolloAIService({
    apiKey: params.apiKey
  });
  let result;
  try {
    result = await api[apiMethodName](params);
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[POLLO_ERROR] ${action}:`, error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}