import axios from "axios";
import {
  randomUUID,
  randomBytes
} from "crypto";
import SpoofHead from "@/lib/spoof-head";
class SeaArtAI {
  constructor() {
    this.baseURL = "https://www.seaart.ai";
    this.apiBaseURL = "https://www.seaart.ai/api/v1";
    this.token = null;
    this.deviceData = this.generateDeviceData();
  }
  generateDeviceData() {
    return {
      device_id: randomUUID(),
      browser_id: randomUUID(),
      page_id: randomUUID(),
      device_code: randomUUID().replace(/-/g, ""),
      session_id: randomUUID()
    };
  }
  randomID(length = 16) {
    return randomBytes(length).toString("hex");
  }
  buildHeaders() {
    const headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      origin: this.baseURL,
      referer: `${this.baseURL}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-request-id": this.randomID(8),
      "content-type": "application/json",
      "x-device-id": this.deviceData.device_id,
      "x-browser-id": this.deviceData.browser_id,
      cookie: `deviceId=${this.deviceData.device_id}; browserId=${this.deviceData.browser_id};`,
      ...SpoofHead()
    };
    if (this.token) {
      headers.token = this.token;
    }
    return headers;
  }
  async login() {
    if (this.token) return this.token;
    console.log("Token tidak ditemukan, melakukan proses login baru...");
    try {
      const {
        data
      } = await axios.post("https://api.seaart.io/art-studio/v1/account/login", {
        type: 16
      }, {
        headers: this.buildHeaders()
      });
      if (!data?.data?.token) throw new Error("Gagal mendapatkan token!");
      this.token = data.data.token;
      console.log("Login berhasil, token telah disimpan.");
      return this.token;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`Login Gagal: ${errorMsg}`);
    }
  }
  async models() {
    await this.login();
    try {
      const response = await axios.post(`${this.apiBaseURL}/task/v2/model-rec`, {
        scene: "model"
      }, {
        headers: this.buildHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        error: error.response?.data || error.message
      };
    }
  }
  async generate({
    prompt,
    model_index = 0,
    width = 512,
    height = 768,
    steps = 20,
    cfg_scale = 7,
    sampler_name = "DPM++ 2M Karras",
    n_iter = 1,
    vae = "vae-ft-mse-840000-ema-pruned",
    clip_skip = 2,
    seed = -1,
    restore_faces = false,
    anime_enhance = 2,
    mode = 0,
    gen_mode = 0,
    prompt_magic_mode = 2
  }) {
    await this.login();
    const modelsResponse = await this.getModels();
    const models = modelsResponse?.data?.items;
    if (!models || model_index < 0 || model_index >= models.length) {
      throw new Error("Gagal mengambil model atau indeks model tidak valid.");
    }
    const selectedModel = models[model_index].art_model;
    const model_no = selectedModel.id;
    const model_ver_no = selectedModel.model_ver_no;
    console.log(`\nMenggunakan model [${model_index}]: ${selectedModel.name} (ID: ${model_no})`);
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
        seed: seed === -1 ? Math.floor(Math.random() * 1e9) : seed,
        restore_faces: restore_faces,
        generate: {
          anime_enhance: anime_enhance,
          mode: mode,
          gen_mode: gen_mode,
          prompt_magic_mode: prompt_magic_mode
        }
      },
      g_mode: 1,
      g_recaptcha_token: this.randomID()
    };
    try {
      const {
        data
      } = await axios.post(`${this.apiBaseURL}/task/v2/text-to-img`, payload, {
        headers: this.buildHeaders()
      });
      if (!data?.data?.id) throw new Error("Gagal membuat task!");
      console.log("Task berhasil dibuat dengan ID:", data.data.id);
      console.log("Menunggu hasil gambar...");
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
      } = await axios.post(`${this.apiBaseURL}/task/batch-progress`, {
        task_ids: [taskId],
        g_mode: 1
      }, {
        headers: this.buildHeaders()
      });
      const task = data?.data?.items?.[0];
      if (task?.status === 3) {
        console.log("Proses generate gambar selesai.");
        return {
          result: task.img_uris || []
        };
      }
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
        action: "generate | models"
      }
    });
  }
  const api = new SeaArtAI();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await api[action](params);
        break;
      case "models":
        result = await api[action]();
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: generate | models`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}