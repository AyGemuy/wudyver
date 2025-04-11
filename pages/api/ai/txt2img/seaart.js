import axios from "axios";
import {
  randomUUID
} from "crypto";
class SeaArtAI {
  constructor() {
    this.baseURL = "https://www.seaart.ai/api/v1";
    this.token = null;
    this.deviceData = this.generateDeviceData();
  }
  generateDeviceData() {
    return {
      device_id: randomUUID(),
      browser_id: randomUUID(),
      page_id: randomUUID(),
      device_code: randomUUID().replace(/-/g, ""),
      session_id: randomUUID(),
      user_agent: this.generateUserAgent()
    };
  }
  generateUserAgent() {
    return `Mozilla/5.0 (Linux; Android ${Math.floor(Math.random() * 6) + 8}; SEA-${Math.floor(Math.random() * 9999)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * 50) + 100}.0.0.0 Mobile Safari/537.36`;
  }
  async login() {
    try {
      const {
        data
      } = await axios.post("https://api.seaart.io/art-studio/v1/account/login", {
        type: 16
      }, {
        headers: this.getHeaders()
      });
      if (!data?.data?.token) throw new Error("Gagal mendapatkan token!");
      this.token = data.data.token;
      return this.token;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }
  async getModels() {
    await this.login();
    try {
      const response = await axios.post(`${this.baseURL}/task/v2/model-rec`, {
        scene: "model"
      }, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        error: error.response?.data || error.message
      };
    }
  }
  async generateImage({
    prompt,
    model_no = "9a0e9e0cc9a1ab753e356d4a3c51a76b",
    model_ver_no = "ad6e90eb8ff8303c4890eb978c919abd",
    width = 512,
    height = 768,
    steps = 20,
    cfg_scale = 7,
    sampler_name = "DPM++ 2M Karras",
    n_iter = 2,
    vae = "vae-ft-mse-840000-ema-pruned",
    clip_skip = 2,
    seed = Math.floor(Math.random() * 1e9),
    restore_faces = false,
    anime_enhance = 2,
    mode = 0,
    gen_mode = 0,
    prompt_magic_mode = 2
  }) {
    await this.login();
    const payload = {
      model_no: model_no,
      model_ver_no: model_ver_no,
      speed_type: 2,
      meta: {
        prompt: prompt,
        width: width,
        height: height,
        steps: steps,
        cfg_scale: cfg_scale,
        sampler_name: sampler_name,
        n_iter: n_iter,
        vae: vae,
        clip_skip: clip_skip,
        seed: seed,
        restore_faces: restore_faces,
        generate: {
          anime_enhance: anime_enhance,
          mode: mode,
          gen_mode: gen_mode,
          prompt_magic_mode: prompt_magic_mode
        }
      },
      g_mode: 1,
      g_recaptcha_token: "your_recaptcha_token_here"
    };
    try {
      const {
        data
      } = await axios.post(`${this.baseURL}/task/v2/text-to-img`, payload, {
        headers: this.getHeaders()
      });
      if (!data?.data?.id) throw new Error("Gagal membuat task!");
      return await this.pollTask(data.data.id);
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }
  async pollTask(taskId, interval = 3e3) {
    while (true) {
      await new Promise(res => setTimeout(res, interval));
      const {
        data
      } = await axios.post(`${this.baseURL}/task/batch-progress`, {
        task_ids: [taskId],
        g_mode: 1
      }, {
        headers: this.getHeaders()
      });
      const task = data?.data?.items?.[0];
      if (task?.status === 3) return {
        result: task.img_uris || []
      };
    }
  }
  getHeaders() {
    return {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": this.deviceData.user_agent,
      "x-device-id": this.deviceData.device_id,
      "x-browser-id": this.deviceData.browser_id,
      cookie: `deviceId=${this.deviceData.device_id}; browserId=${this.deviceData.browser_id};`,
      ...this.token ? {
        token: this.token
      } : {}
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) return res.status(400).json({
    error: "Action is required"
  });
  const seaArtAI = new SeaArtAI();
  try {
    switch (action) {
      case "generate":
        if (!params.prompt) return res.status(400).json({
          error: "Prompt is required"
        });
        return res.status(200).json(await seaArtAI.generateImage(params));
      case "models":
        return res.status(200).json(await seaArtAI.getModels());
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
  } catch {
    return res.status(500).json({
      error: "Error processing request"
    });
  }
}