import fetch from "node-fetch";
import {
  Agent as HttpsAgent
} from "https";
import FormData from "form-data";
import ApiKey from "@/configs/api-key";
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
class Api302Service {
  constructor() {
    this.apiKeys = ApiKey.threezero;
    this.currentKeyIndex = 0;
    this.config = {
      endpoint: "https://api.302.ai",
      defaultHeaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: this.getCurrentKey()
      }
    };
  }
  getCurrentKey() {
    return this.apiKeys[this.currentKeyIndex];
  }
  rotateToNextKey() {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    this.config.defaultHeaders.Authorization = this.getCurrentKey();
    console.log(`[API_KEY] Rotated to key index: ${this.currentKeyIndex}`);
  }
  decode(str) {
    try {
      return JSON.parse(Buffer.from(str, "base64").toString());
    } catch {
      return Buffer.from(str, "base64").toString();
    }
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
        throw new Error("String image harus berupa URL atau base64");
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
  async _attemptReq(params, attempt = 1, originalKeyIndex = this.currentKeyIndex) {
    const {
      path,
      method,
      basePath = "",
      formData
    } = params;
    const url = `${this.config.endpoint}${basePath || ""}${path}`;
    let response, responseText;
    try {
      const options = {
        method: method,
        headers: {
          ...this.config.defaultHeaders
        },
        agent: httpsAgent
      };
      if (formData) {
        delete options.headers["Content-Type"];
        options.body = formData;
      } else if (params.data) {
        options.body = JSON.stringify(params.data);
      }
      console.log(`[API_REQ] ${method} ${url} (Attempt ${attempt}, Key: ${this.currentKeyIndex})`);
      response = await fetch(url, options);
      responseText = await response.text();
      if (!response.ok) {
        if (response.status === 401 && attempt < MAX_ATTEMPTS) {
          console.log(`[API_KEY] Key ${this.currentKeyIndex} failed with 401, rotating to next key`);
          this.rotateToNextKey();
          if (this.currentKeyIndex === originalKeyIndex) {
            throw new Error(`Semua API key gagal: HTTP ${response.status}: ${responseText}`);
          }
          await sleep(attempt * 1e3);
          return await this._attemptReq(params, attempt + 1, originalKeyIndex);
        }
        if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
          await sleep(attempt * 1e3);
          return await this._attemptReq(params, attempt + 1, originalKeyIndex);
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
      const isAuth = error.message.includes("401") || error.message.includes("Unauthorized");
      if (isAuth && attempt < MAX_ATTEMPTS && this.currentKeyIndex !== originalKeyIndex) {
        console.log(`[API_KEY] Auth error, rotating to next key`);
        this.rotateToNextKey();
        if (this.currentKeyIndex === originalKeyIndex) {
          throw new Error(`Semua API key gagal: ${error.message}`);
        }
        await sleep(attempt * 1e3);
        return await this._attemptReq(params, attempt + 1, originalKeyIndex);
      }
      if (isNetwork && attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 1e3);
        return await this._attemptReq(params, attempt + 1, originalKeyIndex);
      }
      throw error;
    }
  }
  async img2vid({
    image,
    prompt
  }) {
    this._validateRequired({
      image: image,
      prompt: prompt
    }, ["image", "prompt"]);
    const {
      buffer,
      filename
    } = await this._resolveImage(image);
    const form = new FormData();
    form.append("image", buffer, {
      filename: filename
    });
    form.append("prompt", prompt);
    return await this._attemptReq({
      method: "POST",
      path: "/302/submit/image-to-video",
      formData: form
    });
  }
  async wan({
    image,
    prompt,
    last_image = "",
    num_frames = 81,
    resolution = "480p",
    frames_per_second = 16,
    interpolate_output = true,
    lora_scale_transformer = 1,
    lora_weights_transformer = "1",
    lora_scale_transformer_2 = 1,
    lora_weights_transformer_2 = "1",
    seed = 123456
  }) {
    this._validateRequired({
      image: image,
      prompt: prompt
    }, ["image", "prompt"]);
    this._validateEnum(resolution, "resolution", ["480p", "720p", "1080p"]);
    return await this._attemptReq({
      method: "POST",
      path: "/302/submit/wan-2.2-i2v-fast",
      data: {
        image: image,
        prompt: prompt,
        last_image: last_image,
        num_frames: num_frames,
        resolution: resolution,
        frames_per_second: frames_per_second,
        interpolate_output: interpolate_output,
        lora_scale_transformer: lora_scale_transformer,
        lora_weights_transformer: lora_weights_transformer,
        lora_scale_transformer_2: lora_scale_transformer_2,
        lora_weights_transformer_2: lora_weights_transformer_2,
        seed: seed
      }
    });
  }
  async wanStatus({
    task_id
  }) {
    this._validateRequired({
      task_id: task_id
    }, ["task_id"]);
    return await this._attemptReq({
      method: "GET",
      path: `/302/task/${task_id}/fetch`
    });
  }
  async openaiVideo({
    prompt,
    model = "sora-2",
    seconds = 4,
    size = "1280x720",
    input_reference
  }) {
    this._validateRequired({
      prompt: prompt
    }, ["prompt"]);
    this._validateEnum(size, "size", ["1280x720", "720x1280", "1920x1080"]);
    const data = {
      prompt: prompt,
      model: model,
      seconds: seconds,
      size: size
    };
    if (input_reference) data.input_reference = input_reference;
    return await this._attemptReq({
      method: "POST",
      path: "/openai/v1/videos",
      data: data
    });
  }
  async openaiStatus({
    task_id
  }) {
    this._validateRequired({
      task_id: task_id
    }, ["task_id"]);
    return await this._attemptReq({
      method: "GET",
      path: `/openai/v1/videos/${task_id}/content?variant=video`
    });
  }
  async sora({
    model = "sora-2",
    orientation = "portrait",
    prompt,
    size = "small",
    duration = 10,
    images = []
  }) {
    this._validateRequired({
      prompt: prompt
    }, ["prompt"]);
    this._validateEnum(orientation, "orientation", ["portrait", "landscape"]);
    this._validateEnum(size, "size", ["small", "medium", "large"]);
    return await this._attemptReq({
      method: "POST",
      path: "/sora/v2/video",
      data: {
        model: model,
        orientation: orientation,
        prompt: prompt,
        size: size,
        duration: duration,
        images: images
      }
    });
  }
  async soraStatus({
    task_id
  }) {
    this._validateRequired({
      task_id: task_id
    }, ["task_id"]);
    return await this._attemptReq({
      method: "GET",
      path: `/sora/v2/video/${task_id}`
    });
  }
  async _veo3Base({
    prompt,
    model,
    enhance_prompt = true,
    images = [],
    aspect_ratio = "16:9"
  }) {
    this._validateRequired({
      prompt: prompt
    }, ["prompt"]);
    this._validateEnum(aspect_ratio, "aspect_ratio", ["16:9", "9:16", "1:1", "4:3", "3:4"]);
    const data = {
      prompt: prompt,
      model: model,
      enhance_prompt: enhance_prompt,
      aspect_ratio: aspect_ratio
    };
    if (images.length) data.images = images;
    return await this._attemptReq({
      method: "POST",
      path: "/302/submit/veo3-v2",
      data: data
    });
  }
  async veo3(params) {
    params.model = "veo3.1";
    return this._veo3Base(params);
  }
  async veo3v2(params) {
    params.model = "veo3-pro-frames";
    return this._veo3Base(params);
  }
  async veo3Fast({
    text_prompt
  }) {
    this._validateRequired({
      text_prompt: text_prompt
    }, ["text_prompt"]);
    return await this._attemptReq({
      method: "POST",
      path: "/302/submit/veo3-fast",
      data: {
        text_prompt: text_prompt
      }
    });
  }
  async veo3Pro({
    text_prompt
  }) {
    this._validateRequired({
      text_prompt: text_prompt
    }, ["text_prompt"]);
    return await this._attemptReq({
      method: "POST",
      path: "/302/submit/veo3-pro",
      data: {
        text_prompt: text_prompt
      }
    });
  }
  async veo({
    prompt,
    aspect_ratio = "9:16",
    enhance_prompt = true,
    generate_audio = true
  }) {
    this._validateRequired({
      prompt: prompt
    }, ["prompt"]);
    this._validateEnum(aspect_ratio, "aspect_ratio", ["16:9", "9:16", "1:1"]);
    return await this._attemptReq({
      method: "POST",
      path: "/302/submit/veo3",
      data: {
        prompt: prompt,
        aspect_ratio: aspect_ratio,
        enhance_prompt: enhance_prompt,
        generate_audio: generate_audio
      }
    });
  }
  async veoStatus({
    request_id,
    type = "veo3"
  }) {
    this._validateRequired({
      request_id: request_id
    }, ["request_id"]);
    const paths = {
      veo3: `/302/submit/veo3?request_id=${request_id}`,
      "veo3-v2": `/302/submit/veo3-v2/${request_id}`,
      "veo3-fast": `/302/submit/veo3-fast?request_id=${request_id}`,
      "veo3-pro": `/302/submit/veo3-pro?request_id=${request_id}`
    };
    if (!paths[type]) throw new Error(`Tipe status tidak valid: ${type}`);
    return await this._attemptReq({
      method: "GET",
      path: paths[type]
    });
  }
  async kling({
    input_image,
    prompt,
    negative_prompt = "",
    cfg = "0.5",
    aspect_ratio = "1:1",
    camera_type = "zoom",
    camera_value = "-5",
    enable_audio = "",
    callback = ""
  }) {
    this._validateRequired({
      input_image: input_image,
      prompt: prompt
    }, ["input_image", "prompt"]);
    this._validateEnum(aspect_ratio, "aspect_ratio", ["1:1", "16:9", "9:16", "4:3", "3:4"]);
    this._validateEnum(camera_type, "camera_type", ["zoom", "pan", "tilt", "dolly"]);
    const {
      buffer,
      filename
    } = await this._resolveImage(input_image);
    const form = new FormData();
    form.append("input_image", buffer, {
      filename: filename
    });
    form.append("prompt", prompt);
    form.append("negative_prompt", negative_prompt);
    form.append("cfg", cfg);
    form.append("aspect_ratio", aspect_ratio);
    form.append("camera_type", camera_type);
    form.append("camera_value", camera_value);
    if (enable_audio) form.append("enable_audio", enable_audio);
    if (callback) form.append("callback", callback);
    return await this._attemptReq({
      method: "POST",
      path: "/klingai/m2v_15_img2video",
      formData: form
    });
  }
  async cogs({
    model = "cogvideox-3",
    prompt
  }) {
    this._validateRequired({
      prompt: prompt
    }, ["prompt"]);
    return await this._attemptReq({
      method: "POST",
      path: "/zhipu/api/paas/v4/videos/generations",
      data: {
        model: model,
        prompt: prompt
      },
      headers: {
        "Content-Type": "application/json;charset:utf-8;"
      }
    });
  }
  async cogsStatus({
    task_id
  }) {
    this._validateRequired({
      task_id: task_id
    }, ["task_id"]);
    return await this._attemptReq({
      method: "GET",
      path: `/zhipu/api/paas/v4/async-result/${task_id}`,
      headers: {
        "Content-Type": "application/json;charset:utf-8;"
      }
    });
  }
  async minimax({
    model = "MiniMax-Hailuo-2.3-fast",
    first_frame_image,
    prompt,
    duration = 6,
    resolution = "768P"
  }) {
    this._validateRequired({
      first_frame_image: first_frame_image,
      prompt: prompt
    }, ["first_frame_image", "prompt"]);
    this._validateEnum(resolution, "resolution", ["768P", "1080P"]);
    return await this._attemptReq({
      method: "POST",
      path: "/minimaxi/v1/video_generation",
      data: {
        model: model,
        first_frame_image: first_frame_image,
        prompt: prompt,
        duration: duration,
        resolution: resolution
      }
    });
  }
  async minimaxStatus({
    task_id
  }) {
    this._validateRequired({
      task_id: task_id
    }, ["task_id"]);
    return await this._attemptReq({
      method: "GET",
      path: `/minimaxi/v1/query/video_generation?task_id=${task_id}`
    });
  }
  async minimaxFile({
    file_id,
    task_id
  }) {
    this._validateRequired({
      file_id: file_id,
      task_id: task_id
    }, ["file_id", "task_id"]);
    return await this._attemptReq({
      method: "GET",
      path: `/minimaxi/v1/files/retrieve?file_id=${file_id}&task_id=${task_id}`
    });
  }
  async pix({
    model = "v5",
    prompt,
    fusion = [],
    aspect_ratio = "16:9"
  }) {
    this._validateRequired({
      prompt: prompt
    }, ["prompt"]);
    this._validateEnum(aspect_ratio, "aspect_ratio", ["16:9", "9:16", "1:1"]);
    return await this._attemptReq({
      method: "POST",
      path: "/pix/generate",
      data: {
        model: model,
        prompt: prompt,
        fusion: fusion,
        aspect_ratio: aspect_ratio
      }
    });
  }
  async pixStatus({
    task_id
  }) {
    this._validateRequired({
      task_id: task_id
    }, ["task_id"]);
    return await this._attemptReq({
      method: "GET",
      path: `/pix/task/${task_id}/fetch`
    });
  }
}
const ACTION_MAP = {
  img2vid: "img2vid",
  wan: "wan",
  wan_status: "wanStatus",
  openai_video: "openaiVideo",
  openai_status: "openaiStatus",
  sora: "sora",
  sora_status: "soraStatus",
  veo3: "veo3",
  veo3v2: "veo3v2",
  veo3_fast: "veo3Fast",
  veo3_pro: "veo3Pro",
  veo: "veo",
  veo_status: "veoStatus",
  kling: "kling",
  cogs: "cogs",
  cogs_status: "cogsStatus",
  minimax: "minimax",
  minimax_status: "minimaxStatus",
  minimax_file: "minimaxFile",
  pix: "pix",
  pix_status: "pixStatus"
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
  const api = new Api302Service();
  let result;
  try {
    result = await api[apiMethodName](params);
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[ERROR] ${action}:`, error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}