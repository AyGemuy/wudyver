import axios from "axios";
import FormData from "form-data";
import {
  randomBytes
} from "crypto";
class AINanoBanana {
  constructor() {
    this.baseUrl = "https://api.ainanobananapro.io";
    this.headers = {
      "User-Agent": "PixAI-Android-App",
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json"
    };
    this.deviceId = randomBytes(8).toString("hex");
    this.userId = null;
    this.gems = 0;
    this.coins = 0;
    this.cfg = {
      image_models: {
        nano_banana_pro: {
          type: "image",
          supports_i2i: true,
          default_resolution: "1K",
          resolutions: ["512", "1K", "2K", "4K"],
          default_aspect_ratio: "1:1",
          aspect_ratios: ["1:1", "16:9", "9:16", "3:4", "4:3"],
          default_output_format: "PNG",
          output_formats: ["PNG", "JPG", "WEBP"]
        }
      },
      video_models: {
        hailuo02: {
          type: "video",
          supports_i2v: true,
          default_mode: "standard",
          modes: ["standard", "creative"],
          default_is_fast_model: false,
          supports_video_length: true,
          supports_resolution: true
        },
        veo3: {
          type: "video_kie",
          supports_i2v: true,
          default_is_fast_model: false,
          supports_aspect_ratio: true,
          aspect_ratios: ["16:9", "9:16", "1:1", "4:3", "3:4"]
        }
      }
    };
  }
  log(msg, type = "INFO") {
    const timestamp = new Date().toLocaleTimeString();
    const color = type === "ERROR" ? "[31m" : type === "WARN" ? "[33m" : "[32m";
    const reset = "[0m";
    console.log(`[${timestamp}][AINanoBanana]${color}[${type}] ${msg}${reset}`);
  }
  syncState(data) {
    if (!data) return;
    if (data.user_id) this.userId = data.user_id;
    if (data.gems !== undefined) this.gems = parseInt(data.gems || 0);
    if (data.coins !== undefined) this.coins = parseInt(data.coins || 0);
    if (data.user && typeof data.user === "object") this.syncState(data.user);
  }
  wrapResult(data = {}, additionalInfo = {}) {
    return {
      user_id: this.userId,
      gems: this.gems,
      coins: this.coins,
      ...additionalInfo,
      ...data
    };
  }
  getModelConfig(model) {
    if (this.cfg.image_models[model]) {
      return {
        ...this.cfg.image_models[model],
        model_name: model
      };
    }
    if (this.cfg.video_models[model]) {
      return {
        ...this.cfg.video_models[model],
        model_name: model
      };
    }
    return null;
  }
  getAllModels() {
    return {
      image_models: Object.keys(this.cfg.image_models),
      video_models: Object.keys(this.cfg.video_models),
      all_models: [...Object.keys(this.cfg.image_models), ...Object.keys(this.cfg.video_models)]
    };
  }
  async request(endpoint, data = {}, method = "POST", isMultipart = false) {
    try {
      const url = `${this.baseUrl}/${endpoint}`;
      const headers = {
        ...this.headers,
        ...isMultipart ? data.getHeaders() : {}
      };
      const response = await axios({
        method: method,
        url: url,
        data: data,
        headers: headers
      });
      const resData = response?.data;
      console.log(resData);
      this.syncState(resData);
      return resData;
    } catch (e) {
      const serverMsg = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      if (endpoint !== "my_create_task_new_app") {
        this.log(`Error ${endpoint}: ${serverMsg}`, "ERROR");
      } else {
        return {
          error: serverMsg
        };
      }
      return null;
    }
  }
  async tryGetRichAccounts() {
    this.log('Mencari "Reviewer Accounts" (Akun Sultan)...', "WARN");
    const res = await this.request("my_set_default_account", {}, "POST");
    let accountList = [];
    if (res && Array.isArray(res.accounts)) {
      accountList = res.accounts;
    } else if (Array.isArray(res)) {
      accountList = res;
    }
    if (accountList.length > 0) {
      const richAccount = accountList.sort((a, b) => {
        const totalA = (parseInt(a.gems) || 0) + (parseInt(a.coins) || 0);
        const totalB = (parseInt(b.gems) || 0) + (parseInt(b.coins) || 0);
        return totalB - totalA;
      })[0];
      const hasWealth = richAccount.gems > 0 || richAccount.coins > 0;
      if (richAccount && hasWealth) {
        this.log(`Ditemukan akun sultan!`, "INFO");
        this.log(`ID: ${richAccount.user_id} | Coins: ${richAccount.coins} | Gems: ${richAccount.gems}`, "INFO");
        this.userId = richAccount.user_id;
        this.gems = parseInt(richAccount.gems || 0);
        this.coins = parseInt(richAccount.coins || 0);
        return true;
      }
    }
    this.log("Tidak ada akun reviewer yang memiliki saldo.", "WARN");
    return false;
  }
  async ensure(user_id) {
    if (user_id) {
      this.userId = user_id;
      this.log(`Menggunakan User ID: ${this.userId}`, "INFO");
      const userInfo = await this.request("my_get_user_app", {
        user_id: this.userId,
        device_id: this.deviceId
      });
      if (userInfo) {
        this.log(`User Info: Coins: ${this.coins} | Gems: ${this.gems}`, "INFO");
      }
    }
    if (!this.userId) {
      this.log("Login Guest User...", "INFO");
      await this.request("my_user_create", {
        device_id: this.deviceId
      });
    }
    if (this.gems <= 0 && this.coins <= 0) {
      this.log(`Akun miskin (Gems: ${this.gems}, Coins: ${this.coins}). Mencoba alternatif...`, "WARN");
      const foundRich = await this.tryGetRichAccounts();
      if (!foundRich) {
        this.log("Gagal mendapatkan akun gratisan.", "ERROR");
      }
    } else {
      this.log(`Saldo Tersedia - Coins: ${this.coins} | Gems: ${this.gems}`, "INFO");
    }
    return this.userId;
  }
  async info(user_id) {
    await this.ensure(user_id);
    const result = await this.request("my_get_user_app", {
      user_id: this.userId,
      device_id: this.deviceId
    });
    return this.wrapResult(result, {
      action: "get_user_info"
    });
  }
  async upload(fileInput) {
    try {
      this.log("Uploading image...", "INFO");
      const form = new FormData();
      let buffer;
      if (Buffer.isBuffer(fileInput)) {
        buffer = fileInput;
      } else if (typeof fileInput === "string" && fileInput.includes("base64")) {
        buffer = Buffer.from(fileInput.split(",").pop(), "base64");
      } else {
        throw new Error("Format file salah");
      }
      form.append("file", buffer, {
        filename: `img_${Date.now()}.jpg`
      });
      const res = await this.request("upload_file", form, "POST", true);
      if (!res?.image_url) throw new Error("Gagal dapat image_url");
      return res.image_url;
    } catch (e) {
      this.log(`Upload Gagal: ${e.message}`, "ERROR");
      return null;
    }
  }
  async generate({
    user_id,
    prompt,
    image = null,
    model = "nano_banana_pro",
    resolution = null,
    aspect_ratio = null,
    output_format = null,
    is_fast_model = null,
    mode = null,
    video_length = null
  }) {
    await this.ensure(user_id);
    if (!prompt || prompt.trim() === "") {
      return this.wrapResult({
        error: "Parameter 'prompt' is required"
      }, {
        action: "generate",
        status: "failed"
      });
    }
    const modelConfig = this.getModelConfig(model);
    if (!modelConfig) {
      const availableModels = this.getAllModels();
      return this.wrapResult({
        error: `Model '${model}' tidak ditemukan`,
        available_models: availableModels
      }, {
        action: "generate",
        status: "failed"
      });
    }
    if (this.gems < 5 && this.coins < 50) {
      this.log("ABORT: Saldo (Gems/Coins) tidak cukup untuk generate.", "ERROR");
      return this.wrapResult({
        error: "Insufficient Balance Local Check"
      }, {
        action: "generate",
        status: "failed",
        model: model
      });
    }
    let processedImage = null;
    let generationMode = "";
    if (image) {
      if (modelConfig.type === "image" && !modelConfig.supports_i2i) {
        return this.wrapResult({
          error: `Model '${model}' tidak support Image-to-Image`
        }, {
          action: "generate",
          status: "failed",
          model: model
        });
      }
      if (modelConfig.type.includes("video") && !modelConfig.supports_i2v) {
        return this.wrapResult({
          error: `Model '${model}' tidak support Image-to-Video`
        }, {
          action: "generate",
          status: "failed",
          model: model
        });
      }
      if (typeof image === "string" && image.startsWith("http")) {
        processedImage = image;
      } else {
        processedImage = await this.upload(image);
      }
      if (!processedImage) {
        return this.wrapResult({
          error: "Image upload failed"
        }, {
          action: "generate",
          status: "failed",
          model: model
        });
      }
      generationMode = modelConfig.type === "image" ? "I2I" : "I2V";
    } else {
      generationMode = modelConfig.type === "image" ? "T2I" : "T2V";
    }
    let payload;
    if (modelConfig.type === "image") {
      const finalResolution = resolution || modelConfig.default_resolution;
      const finalAspectRatio = aspect_ratio || modelConfig.default_aspect_ratio;
      const finalOutputFormat = output_format || modelConfig.default_output_format;
      if (resolution && !modelConfig.resolutions.includes(resolution)) {
        return this.wrapResult({
          error: `Resolution '${resolution}' tidak valid untuk model '${model}'`,
          valid_resolutions: modelConfig.resolutions
        }, {
          action: "generate",
          status: "failed",
          model: model
        });
      }
      if (aspect_ratio && !modelConfig.aspect_ratios.includes(aspect_ratio)) {
        return this.wrapResult({
          error: `Aspect ratio '${aspect_ratio}' tidak valid untuk model '${model}'`,
          valid_aspect_ratios: modelConfig.aspect_ratios
        }, {
          action: "generate",
          status: "failed",
          model: model
        });
      }
      payload = {
        user_id: this.userId,
        prompt: prompt,
        img_urls: processedImage ? [processedImage] : null,
        model: model,
        resolution: finalResolution,
        aspect_ratio: finalAspectRatio,
        output_format: finalOutputFormat
      };
      this.log(`Mengirim Image Task (${generationMode}) dengan model: ${model}`, "INFO");
    } else if (modelConfig.type === "video") {
      const finalMode = mode || modelConfig.default_mode;
      const finalIsFastModel = is_fast_model !== null ? is_fast_model : modelConfig.default_is_fast_model;
      if (mode && !modelConfig.modes.includes(mode)) {
        return this.wrapResult({
          error: `Mode '${mode}' tidak valid untuk model '${model}'`,
          valid_modes: modelConfig.modes
        }, {
          action: "generate",
          status: "failed",
          model: model
        });
      }
      payload = {
        user_id: this.userId,
        prompt: prompt,
        image_url: processedImage,
        model: model,
        is_fast_model: finalIsFastModel,
        mode: finalMode,
        video_length: video_length,
        resolution: resolution
      };
      this.log(`Mengirim Video Task (${generationMode}) dengan model: ${model}`, "INFO");
    } else if (modelConfig.type === "video_kie") {
      const finalIsFastModel = is_fast_model !== null ? is_fast_model : modelConfig.default_is_fast_model;
      if (aspect_ratio && modelConfig.supports_aspect_ratio && !modelConfig.aspect_ratios.includes(aspect_ratio)) {
        return this.wrapResult({
          error: `Aspect ratio '${aspect_ratio}' tidak valid untuk model '${model}'`,
          valid_aspect_ratios: modelConfig.aspect_ratios
        }, {
          action: "generate",
          status: "failed",
          model: model
        });
      }
      payload = {
        user_id: this.userId,
        prompt: prompt,
        image_url: processedImage,
        is_fast_model: finalIsFastModel,
        model: model,
        aspect_ratio: aspect_ratio
      };
      this.log(`Mengirim Video Kie Task (${generationMode}) dengan model: ${model}`, "INFO");
    }
    const res = await this.request("my_create_task_new_app", payload);
    if (res?.error) {
      this.log(`Server Reject: ${res.error}`, "ERROR");
      return this.wrapResult(res, {
        action: "generate",
        status: "failed",
        model: model,
        mode: generationMode
      });
    } else if (res && res.id) {
      this.log(`Task Berhasil Dibuat! ID: ${res.id}`, "INFO");
      await this.info(this.userId);
      return this.wrapResult(res, {
        action: "generate",
        status: "success",
        task_id: res.id,
        model: model,
        model_type: modelConfig.type,
        generation_mode: generationMode
      });
    }
    return this.wrapResult(res, {
      action: "generate",
      status: "unknown",
      model: model,
      mode: generationMode
    });
  }
  async status({
    user_id,
    task_id
  }) {
    await this.ensure(user_id);
    if (!task_id) {
      return this.wrapResult({
        error: "task_id required"
      }, {
        action: "get_status",
        status: "failed"
      });
    }
    const result = await this.request("my_get_task_status", {
      task_id: task_id
    });
    return this.wrapResult(result, {
      action: "get_status",
      task_id: task_id
    });
  }
  async getCompletedTasks({
    user_id,
    page = 1,
    page_size = 20
  }) {
    await this.ensure(user_id);
    const result = await this.request("my_get_task_completed_app", {
      user_id: this.userId,
      page: page,
      page_size: page_size
    });
    return this.wrapResult(result, {
      action: "get_completed_tasks",
      page: page
    });
  }
  async getProcessingTasks({
    user_id,
    page = 1,
    page_size = 20
  }) {
    await this.ensure(user_id);
    const result = await this.request("my_get_task_processing_app", {
      user_id: this.userId,
      page: page,
      page_size: page_size
    });
    return this.wrapResult(result, {
      action: "get_processing_tasks",
      page: page
    });
  }
  async deleteTask({
    user_id,
    task_id
  }) {
    await this.ensure(user_id);
    if (!task_id) {
      return this.wrapResult({
        error: "task_id required"
      }, {
        action: "delete_task",
        status: "failed"
      });
    }
    const result = await this.request("my_delete_task_app", {
      task_id: task_id
    });
    return this.wrapResult(result, {
      action: "delete_task",
      task_id: task_id
    });
  }
  async listModels() {
    return this.wrapResult({
      models: this.getAllModels(),
      model_details: {
        image_models: this.cfg.image_models,
        video_models: this.cfg.video_models
      }
    }, {
      action: "list_models"
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi",
      actions: ["generate", "status", "completed_tasks", "processing_tasks", "delete_task", "info", "list_models"],
      examples: {
        text_to_image: {
          action: "generate",
          prompt: "Beautiful sunset over mountains",
          model: "nano_banana_pro",
          resolution: "1K",
          aspect_ratio: "16:9",
          output_format: "PNG"
        },
        image_to_image: {
          action: "generate",
          prompt: "Transform into anime style",
          image: "base64_or_url",
          model: "nano_banana_pro"
        },
        text_to_video: {
          action: "generate",
          prompt: "A person dancing in the rain",
          model: "hailuo02",
          mode: "standard",
          is_fast_model: false
        },
        image_to_video: {
          action: "generate",
          prompt: "Make this image come alive",
          image: "base64_or_url",
          model: "hailuo02"
        },
        advanced_video: {
          action: "generate",
          prompt: "Cinematic scene of a futuristic city",
          model: "veo3",
          aspect_ratio: "16:9",
          is_fast_model: false
        }
      },
      note: "The 'generate' action auto-detects T2I/I2I/T2V/I2V based on model and image parameter"
    });
  }
  const api = new AINanoBanana();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'",
            available_models: api.getAllModels(),
            example: {
              action: "generate",
              prompt: "Your prompt here",
              model: "nano_banana_pro"
            }
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib diisi untuk action 'status'",
            example: {
              action: "status",
              task_id: "xxxxxxxxx"
            }
          });
        }
        result = await api.status(params);
        break;
      case "completed_tasks":
        result = await api.getCompletedTasks(params);
        break;
      case "processing_tasks":
        result = await api.getProcessingTasks(params);
        break;
      case "delete_task":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib diisi untuk action 'delete_task'",
            example: {
              action: "delete_task",
              task_id: "xxxxxxxxx"
            }
          });
        }
        result = await api.deleteTask(params);
        break;
      case "info":
        result = await api.info(params.user_id);
        break;
      case "list_models":
        result = await api.listModels();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "status", "completed_tasks", "processing_tasks", "delete_task", "info", "list_models"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}