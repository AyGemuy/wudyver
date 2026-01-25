import axios from "axios";
import FormData from "form-data";
import {
  randomBytes
} from "crypto";
class Seedance {
  constructor() {
    this.baseUrl = "https://magicaime.com";
    this.headers = {
      "User-Agent": "okhttp/4.12.0",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json"
    };
    this.deviceId = randomBytes(8).toString("hex");
    this.userId = null;
    this.gems = 0;
    this.coins = 0;
  }
  log(msg, type = "INFO") {
    const timestamp = new Date().toLocaleTimeString();
    const color = type === "ERROR" ? "[31m" : type === "WARN" ? "[33m" : "[32m";
    const reset = "[0m";
    console.log(`[${timestamp}][Seedance]${color}[${type}] ${msg}${reset}`);
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
      if (endpoint !== "seedance_create_task_new") {
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
    const res = await this.request("seedance_set_default_account", {}, "POST");
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
      const userInfo = await this.request("seedance_get_user", {
        user_id: this.userId,
        device_id: this.deviceId
      });
      if (userInfo) {
        this.log(`User Info: Coins: ${this.coins} | Gems: ${this.gems}`, "INFO");
      }
    }
    if (!this.userId) {
      this.log("Login Guest User...", "INFO");
      await this.request("seedance_user_create", {
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
    const result = await this.request("seedance_get_user", {
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
      if (Buffer.isBuffer(fileInput)) buffer = fileInput;
      else if (typeof fileInput === "string" && fileInput.includes("base64")) {
        buffer = Buffer.from(fileInput.split(",").pop(), "base64");
      } else throw new Error("Format file salah");
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
    image,
    is_fast_model = true
  }) {
    await this.ensure(user_id);
    if (this.gems < 5 && this.coins < 50) {
      this.log("ABORT: Saldo (Gems/Coins) tidak cukup untuk generate.", "ERROR");
      return this.wrapResult({
        error: "Insufficient Balance Local Check"
      }, {
        action: "generate",
        status: "failed"
      });
    }
    let finalImageUrl = "";
    if (image) {
      if (typeof image === "string" && image.startsWith("http")) finalImageUrl = image;
      else finalImageUrl = await this.upload(image);
      if (!finalImageUrl) {
        return this.wrapResult({
          error: "Image upload failed"
        }, {
          action: "generate",
          status: "failed"
        });
      }
    }
    const payload = {
      user_id: this.userId,
      prompt: prompt || "Dancing video",
      image_url: finalImageUrl,
      is_fast_model: Boolean(is_fast_model)
    };
    this.log(`Mengirim Task (${finalImageUrl ? "I2V" : "T2V"})...`, "INFO");
    const res = await this.request("seedance_create_task_new", payload);
    if (res?.error) {
      this.log(`Server Reject: ${res.error}`, "ERROR");
      return this.wrapResult(res, {
        action: "generate",
        status: "failed"
      });
    } else if (res && res.id) {
      this.log(`Task Berhasil Dibuat! ID: ${res.id}`, "INFO");
      await this.info(this.userId);
      return this.wrapResult(res, {
        action: "generate",
        status: "success",
        task_id: res.id
      });
    }
    return this.wrapResult(res, {
      action: "generate",
      status: "unknown"
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
    const result = await this.request("seedance_get_task_status", {
      task_id: task_id
    });
    return this.wrapResult(result, {
      action: "get_status",
      task_id: task_id
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
      actions: ["generate", "status"]
    });
  }
  const api = new Seedance();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'",
            example: {
              action: "generate",
              prompt: "A futuristic car driving through neon city"
            }
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id'' wajib diisi untuk action 'status'",
            example: {
              action: "status",
              task_id: "xxxxxxxxx"
            }
          });
        }
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "status"]
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