import axios from "axios";
import ApiKey from "@/configs/api-key";
class KieAI {
  constructor() {
    this.apiKeys = ApiKey.kie;
    this.currentKeyIndex = 0;
    this.baseUrl = "https://api.kie.ai/api/v1";
  }
  getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKeys[this.currentKeyIndex]}`,
      "Content-Type": "application/json"
    };
  }
  rotateKey() {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    console.log(`[KieAI] Switching to API Key Index: ${this.currentKeyIndex}`);
  }
  _formatResult(status, message, data = null) {
    return {
      status: status,
      message: message,
      data: data,
      models: this.models()
    };
  }
  _findModel(modelName) {
    const allGroups = this.models();
    for (const key in allGroups) {
      const found = allGroups[key].find(m => m.model === modelName);
      if (found) return found;
    }
    return null;
  }
  models({
    ...rest
  } = {}) {
    return {
      seedream: [{
        model: "bytedance/seedream",
        payload: {
          prompt: "",
          image_size: "square_hd",
          guidance_scale: 2.5,
          enable_safety_checker: true
        }
      }, {
        model: "bytedance/seedream-v4-text-to-image",
        payload: {
          prompt: "",
          image_size: "square_hd",
          image_resolution: "1K",
          max_images: 1
        }
      }, {
        model: "bytedance/seedream-v4-edit",
        payload: {
          prompt: "",
          image_urls: [],
          image_size: "square_hd",
          image_resolution: "1K",
          max_images: 1
        }
      }, {
        model: "seedream/4.5-text-to-image",
        payload: {
          prompt: "",
          aspect_ratio: "1:1",
          quality: "basic"
        }
      }, {
        model: "seedream/4.5-edit",
        payload: {
          prompt: "",
          image_urls: [],
          aspect_ratio: "1:1",
          quality: "basic"
        }
      }],
      google: [{
        model: "google/nano-banana",
        payload: {
          prompt: "",
          output_format: "png",
          image_size: "1:1"
        }
      }, {
        model: "google/nano-banana-edit",
        payload: {
          prompt: "",
          image_urls: [],
          output_format: "png",
          image_size: "1:1"
        }
      }, {
        model: "nano-banana-pro",
        payload: {
          prompt: "",
          image_input: [],
          aspect_ratio: "1:1",
          resolution: "1K",
          output_format: "png"
        }
      }, {
        model: "google/imagen4-fast",
        payload: {
          prompt: "",
          negative_prompt: "",
          aspect_ratio: "16:9",
          num_images: "1"
        }
      }, {
        model: "google/imagen4-ultra",
        payload: {
          prompt: "",
          negative_prompt: "",
          aspect_ratio: "1:1",
          seed: ""
        }
      }, {
        model: "google/imagen4",
        payload: {
          prompt: "",
          negative_prompt: "",
          aspect_ratio: "1:1",
          seed: ""
        }
      }, {
        model: "google/pro-image-to-image",
        payload: {
          prompt: "",
          image_urls: [],
          aspect_ratio: "1:1"
        }
      }],
      flux: [{
        model: "flux-2/pro-image-to-image",
        payload: {
          input_urls: [],
          prompt: "",
          aspect_ratio: "1:1",
          resolution: "1K"
        }
      }, {
        model: "flux-2/pro-text-to-image",
        payload: {
          prompt: "",
          aspect_ratio: "1:1",
          resolution: "1K"
        }
      }, {
        model: "flux-2/flex-image-to-image",
        payload: {
          input_urls: [],
          prompt: "",
          aspect_ratio: "1:1",
          resolution: "1K"
        }
      }, {
        model: "flux-2/flex-text-to-image",
        payload: {
          prompt: "",
          aspect_ratio: "1:1",
          resolution: "1K"
        }
      }],
      grok: [{
        model: "grok-imagine/text-to-image",
        payload: {
          prompt: "",
          aspect_ratio: "3:2"
        }
      }, {
        model: "grok-imagine/image-to-image",
        payload: {
          prompt: "",
          image_urls: []
        }
      }, {
        model: "grok-imagine/upscale",
        payload: {
          image_url: ""
        }
      }],
      gpt: [{
        model: "gpt-image/1.5-text-to-image",
        payload: {
          prompt: "",
          aspect_ratio: "1:1",
          quality: "medium"
        }
      }, {
        model: "gpt-image/1.5-image-to-image",
        payload: {
          input_urls: [],
          prompt: "",
          aspect_ratio: "3:2",
          quality: "medium"
        }
      }, {
        model: "gpt4o-image/generate",
        payload: {
          prompt: "",
          size: "1024x1024"
        }
      }],
      ideogram: [{
        model: "ideogram/v3-reframe",
        payload: {
          image_url: "",
          prompt: "",
          aspect_ratio: "1:1"
        }
      }, {
        model: "ideogram/character-edit",
        payload: {
          image_url: "",
          prompt: ""
        }
      }, {
        model: "ideogram/character-remix",
        payload: {
          image_url: "",
          prompt: ""
        }
      }, {
        model: "ideogram/character",
        payload: {
          prompt: ""
        }
      }],
      qwen: [{
        model: "qwen/text-to-image",
        payload: {
          prompt: ""
        }
      }, {
        model: "qwen/image-to-image",
        payload: {
          prompt: "",
          image_url: ""
        }
      }, {
        model: "qwen/image-edit",
        payload: {
          prompt: "",
          image_url: ""
        }
      }],
      recraft: [{
        model: "recraft/remove-background",
        payload: {
          image_url: ""
        }
      }, {
        model: "recraft/crisp-upscale",
        payload: {
          image_url: "",
          resize_scale: 2
        }
      }],
      topaz: [{
        model: "topaz/image-upscale",
        payload: {
          image_url: ""
        }
      }, {
        model: "topaz/video-upscale",
        payload: {
          video_url: ""
        }
      }],
      z_image: [{
        model: "z-image",
        payload: {
          prompt: "",
          aspect_ratio: "1:1"
        }
      }],
      sora: [{
        model: "sora-2-text-to-video",
        payload: {
          prompt: "",
          aspect_ratio: "landscape",
          n_frames: "10",
          remove_watermark: true,
          character_id_list: []
        }
      }, {
        model: "sora-2-image-to-video",
        payload: {
          prompt: "",
          image_urls: [],
          aspect_ratio: "landscape",
          n_frames: "10",
          remove_watermark: true,
          character_id_list: []
        }
      }, {
        model: "sora-2-pro-text-to-video",
        payload: {
          prompt: "",
          aspect_ratio: "16:9"
        }
      }, {
        model: "sora-2-pro-image-to-video",
        payload: {
          prompt: "",
          image_urls: []
        }
      }, {
        model: "sora-watermark-remover",
        payload: {
          video_url: ""
        }
      }, {
        model: "sora-2-characters",
        payload: {
          prompt: ""
        }
      }],
      kling: [{
        model: "kling/text-to-video",
        payload: {
          prompt: "",
          ratio: "16:9"
        }
      }, {
        model: "kling/image-to-video",
        payload: {
          prompt: "",
          image_url: ""
        }
      }, {
        model: "kling/v2-5-turbo-text-to-video-pro",
        payload: {
          prompt: ""
        }
      }, {
        model: "kling/v2-5-turbo-image-to-video-pro",
        payload: {
          prompt: "",
          image_url: ""
        }
      }, {
        model: "kling/ai-avatar-v1-pro",
        payload: {
          image_url: "",
          text: ""
        }
      }],
      hailuo: [{
        model: "hailuo/02-text-to-video-pro",
        payload: {
          prompt: ""
        }
      }, {
        model: "hailuo/02-image-to-video-pro",
        payload: {
          prompt: "",
          image_url: ""
        }
      }, {
        model: "hailuo/2-3-image-to-video-pro",
        payload: {
          prompt: "",
          image_url: ""
        }
      }],
      bytedance_video: [{
        model: "bytedance/seedance-1.5-pro",
        payload: {
          prompt: ""
        }
      }, {
        model: "bytedance/v1-pro-text-to-video",
        payload: {
          prompt: ""
        }
      }, {
        model: "bytedance/v1-pro-image-to-video",
        payload: {
          prompt: "",
          image_url: ""
        }
      }],
      wan: [{
        model: "wan/2-6-text-to-video",
        payload: {
          prompt: ""
        }
      }, {
        model: "wan/2-6-image-to-video",
        payload: {
          prompt: "",
          image_url: ""
        }
      }, {
        model: "wan/2-6-video-to-video",
        payload: {
          prompt: "",
          video_url: ""
        }
      }, {
        model: "wan/2-2-animate-move",
        payload: {
          image_url: ""
        }
      }],
      runway: [{
        model: "runway/generate",
        payload: {
          prompt: ""
        }
      }, {
        model: "runway/aleph",
        payload: {
          video_url: "",
          prompt: ""
        }
      }],
      luma: [{
        model: "luma/modify",
        payload: {
          video_url: "",
          prompt: ""
        }
      }],
      veo: [{
        model: "veo/generate",
        payload: {
          prompt: ""
        }
      }],
      elevenlabs: [{
        model: "elevenlabs/text-to-speech-multilingual-v2",
        payload: {
          text: "",
          voice: "Rachel",
          stability: .5,
          similarity_boost: .75,
          style: 0,
          speed: 1,
          timestamps: false
        }
      }, {
        model: "elevenlabs/sound-effect-v2",
        payload: {
          text: ""
        }
      }, {
        model: "elevenlabs/speech-to-text",
        payload: {
          audio_url: ""
        }
      }, {
        model: "elevenlabs/audio-isolation",
        payload: {
          audio_url: ""
        }
      }],
      suno: [{
        model: "suno/generate",
        payload: {
          prompt: "",
          make_instrumental: false
        }
      }, {
        model: "suno/generate/extend",
        payload: {
          audio_id: "",
          continue_at: 0
        }
      }, {
        model: "suno/generate/lyrics",
        payload: {
          prompt: ""
        }
      }],
      infinitalk: [{
        model: "infinitalk/from-audio",
        payload: {
          audio_url: ""
        }
      }]
    };
  }
  async generate({
    model,
    callBackUrl = "",
    ...inputRest
  }) {
    try {
      console.log(`\n[KieAI] Processing request for: ${model}`);
      const modelData = this._findModel(model);
      if (!modelData) {
        return this._formatResult(false, `Model '${model}' not found. Please check model list.`);
      }
      const defaultPayload = modelData.payload;
      const input = {
        ...defaultPayload,
        ...inputRest
      };
      const mandatoryKeys = ["prompt", "image_url", "image_urls", "video_url", "audio_url", "text", "input_urls"];
      for (const key of mandatoryKeys) {
        if (key in defaultPayload) {
          const val = input[key];
          const isEmpty = val === "" || val === null || val === undefined || Array.isArray(val) && val.length === 0;
          if (isEmpty) {
            return this._formatResult(false, `Parameter '${key}' is required for model '${model}'`);
          }
        }
      }
      const payload = {
        model: model,
        callBackUrl: callBackUrl,
        input: input
      };
      let createData = null;
      let success = false;
      let lastErrorMsg = "Unknown error";
      for (let i = 0; i < this.apiKeys.length; i++) {
        try {
          const response = await axios.post(`${this.baseUrl}/jobs/createTask`, payload, {
            headers: this.getHeaders()
          });
          createData = response.data;
          if (!createData || !createData.data || !createData.data.taskId) {
            const apiMsg = createData?.msg || "Invalid API response";
            throw new Error(apiMsg);
          }
          success = true;
          break;
        } catch (error) {
          lastErrorMsg = error?.response?.data?.msg || error.message;
          console.error(`[KieAI] Error with Key [${this.currentKeyIndex}]: ${lastErrorMsg}`);
          this.rotateKey();
          continue;
        }
      }
      if (!success) {
        return this._formatResult(false, `All API keys failed. Last error: ${lastErrorMsg}`);
      }
      const taskId = createData?.data?.taskId;
      console.log(`[KieAI] Task Created ID: ${taskId}`);
      return await this._poll(taskId);
    } catch (error) {
      console.error("[KieAI] System Error:", error.message);
      return this._formatResult(false, `System Error: ${error.message}`);
    }
  }
  async _poll(taskId) {
    let isComplete = false;
    let resultData = null;
    while (!isComplete) {
      await new Promise(r => setTimeout(r, 3e3));
      try {
        const {
          data: checkData
        } = await axios.get(`${this.baseUrl}/jobs/recordInfo`, {
          params: {
            taskId: taskId
          },
          headers: this.getHeaders()
        });
        const taskInfo = checkData?.data || {};
        const state = taskInfo.state;
        process.stdout.write(`\r[KieAI] Status: ${state}...`);
        if (state === "success") {
          console.log("\n[KieAI] Finished!");
          isComplete = true;
          let resultParsed = {};
          try {
            resultParsed = taskInfo.resultJson ? JSON.parse(taskInfo.resultJson) : {};
          } catch (e) {
            resultParsed = {
              raw: taskInfo.resultJson
            };
          }
          resultData = {
            taskId: taskId,
            ...resultParsed,
            ...taskInfo
          };
          return this._formatResult(true, "Task completed successfully", resultData);
        } else if (state === "failed" || state === "fail") {
          console.log("\n[KieAI] Failed.");
          return this._formatResult(false, `Task Failed: ${taskInfo.failMsg || "Unknown error during processing"}`);
        }
      } catch (err) {
        return this._formatResult(false, `Polling Error: ${err.message}`);
      }
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new KieAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}