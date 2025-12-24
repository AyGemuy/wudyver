import axios from "axios";
class MyImgAI {
  constructor(tokenManual = null) {
    this.headers = {
      "Content-Type": "application/json",
      Origin: "https://www.myimg.ai",
      Referer: "https://www.myimg.ai/",
      Accept: "*/*",
      "Accept-Language": "id-ID",
      Priority: "u=1, i",
      "Sec-Ch-Ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.baseUrl = "https://api.myimg.ai/api";
    this.token = tokenManual;
    this.modes = {
      consistent: {
        endpoint: "/image/consistent-character",
        actionType: "image_consistent_character",
        required: ["imageUrl", "prompt"],
        defaults: {}
      },
      enhance: {
        endpoint: "/image/enhance",
        actionType: "image_enhance",
        required: ["imageUrl"],
        defaults: {}
      },
      nsfw: {
        endpoint: "/image/nsfw-text-to-image-v2",
        actionType: "image_nsfw_text_to_image_v2",
        required: ["prompt"],
        defaults: {
          style: "default",
          width: 576,
          height: 1024
        }
      },
      segment: {
        endpoint: "/image/segment",
        actionType: "image_segment",
        required: ["imageUrl"],
        defaults: {}
      }
    };
  }
  log(msg) {
    console.log(`[MyImgAI] ${msg}`);
  }
  async request(config) {
    try {
      config.headers = {
        ...this.headers,
        ...config.headers
      };
      if (this.token && !config.url.includes("files.myimg.ai")) {
        config.headers["Authorization"] = this.token;
      }
      const response = await axios(config);
      return {
        success: true,
        data: response.data
      };
    } catch (e) {
      const res = e.response;
      return {
        success: false,
        code: res?.status || 500,
        message: res?.data?.message || e.message
      };
    }
  }
  async login() {
    if (this.token && this.token.length > 20) {
      this.log("Menggunakan Token Manual...");
      return;
    }
    this.log("Login guest baru...");
    const res = await this.request({
      method: "POST",
      url: `${this.baseUrl}/account/login`,
      data: {
        platform: "guest",
        device: {},
        website: "myimg"
      }
    });
    if (res.success && res.data?.result?.token) {
      this.token = res.data.result.token;
      this.log("Login sukses.");
    } else {
      this.log(`Login gagal: ${res.message}`);
    }
  }
  async ensureToken() {
    if (!this.token) await this.login();
  }
  async getAccountDetail() {
    const res = await this.request({
      method: "GET",
      url: `${this.baseUrl}/account/detail`,
      params: {
        website: "myimg"
      }
    });
    return res.success ? res.data.result : null;
  }
  async waitForCredits(mode) {
    await this.ensureToken();
    const cfg = this.modes[mode];
    if (!cfg) return false;
    const actionType = cfg.actionType;
    this.log(`Mengecek ketersediaan saldo untuk: ${mode}...`);
    while (true) {
      const profile = await this.getAccountDetail();
      if (!profile) {
        this.log("Gagal mengambil profil. Mencoba lagi dalam 5 detik...");
        await new Promise(r => setTimeout(r, 5e3));
        continue;
      }
      const currentCredits = parseFloat(profile.credits || 0);
      const actionInfo = profile.actionTypeLefts?.find(a => a.actionType === actionType);
      const cost = actionInfo ? parseFloat(actionInfo.credits) : 0;
      if (currentCredits >= cost) {
        this.log(`Saldo Cukup! (Saldo: ${currentCredits} | Biaya: ${cost}). Melanjutkan...`);
        return true;
      } else {
        console.log(`[WAIT] Saldo: ${currentCredits} | Butuh: ${cost}. Menunggu topup... (Cek ulang 10s)`);
        await new Promise(r => setTimeout(r, 1e4));
      }
    }
  }
  async getBuffer(source) {
    try {
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string" && source.startsWith("data:")) return Buffer.from(source.split(",")[1], "base64");
      if (typeof source === "string" && source.startsWith("http") && !source.includes("myimg.ai")) {
        const res = await axios.get(source, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      return source;
    } catch {
      return null;
    }
  }
  async upload(imageInput) {
    await this.ensureToken();
    if (typeof imageInput === "string" && imageInput.includes("files.myimg.ai")) return imageInput;
    const buffer = await this.getBuffer(imageInput);
    if (!buffer) return null;
    this.log("Upload: Get Presign...");
    const preRes = await this.request({
      method: "POST",
      url: `${this.baseUrl}/upload/presign`,
      params: {
        action_type: "image_upload",
        content_type: "image/jpeg"
      }
    });
    const result = preRes.data?.result;
    if (!preRes.success || !result?.presignUrl) return null;
    try {
      await axios.put(result.presignUrl, buffer, {
        headers: {
          "Content-Type": "image/jpeg"
        }
      });
      return result.url;
    } catch {
      return null;
    }
  }
  async poll(actionId) {
    this.log(`Polling ID: ${actionId}...`);
    const activeStatuses = ["pending", "created", "running", "processing", "waiting"];
    let status = "pending";
    let finalResult = null;
    while (activeStatuses.includes(status)) {
      await new Promise(r => setTimeout(r, 3e3));
      const res = await this.request({
        method: "GET",
        url: `${this.baseUrl}/action/info`,
        params: {
          action_id: actionId,
          website: "myimg"
        }
      });
      if (!res.success) continue;
      const info = res.data?.result;
      if (!info) continue;
      status = info.status || "unknown";
      if (status === "success") {
        let responseData = info.response;
        if (typeof responseData === "string") try {
          responseData = JSON.parse(responseData);
        } catch {}
        finalResult = responseData || info;
        break;
      } else if (["failed", "error"].includes(status)) {
        return {
          error: info.error || "Task Failed"
        };
      }
    }
    return finalResult;
  }
  async generate({
    mode,
    ...params
  }) {
    if (!mode || !this.modes[mode]) {
      const available = Object.keys(this.modes).join(", ");
      const errorMsg = mode ? `Mode '${mode}' tidak valid.` : `Mode tidak boleh kosong.`;
      return {
        status: false,
        code: 400,
        message: `${errorMsg} Pilihan: [${available}]`
      };
    }
    const cfg = this.modes[mode];
    if (cfg.required) {
      const missing = cfg.required.filter(field => !params[field]);
      if (missing.length > 0) {
        return {
          status: false,
          code: 400,
          message: `Parameter kurang untuk mode '${mode}': [${missing.join(", ")}]`
        };
      }
    }
    try {
      await this.ensureToken();
      await this.waitForCredits(mode);
      let payload = {
        website: "myimg",
        ...cfg.defaults,
        ...params
      };
      const imageFields = ["imageUrl", "modelUrl", "clothesUrl", "maskUrl"];
      for (const field of imageFields) {
        if (params[field]) {
          this.log(`Uploading ${field}...`);
          const uploadedUrl = await this.upload(params[field]);
          if (!uploadedUrl) return {
            status: false,
            message: `Gagal mengupload gambar: ${field}`
          };
          payload[field] = uploadedUrl;
        }
      }
      this.log(`Sending task (${mode})...`);
      const res = await this.request({
        method: "POST",
        url: `${this.baseUrl}${cfg.endpoint}`,
        data: payload
      });
      if (!res.success || res.data?.code !== 200) {
        return {
          status: false,
          message: res.data?.message || "API Error"
        };
      }
      const actionId = res.data?.actionId || res.data?.result?.id;
      if (!actionId) return {
        status: false,
        message: "No Action ID"
      };
      const resultData = await this.poll(actionId);
      if (resultData?.error) return {
        status: false,
        message: resultData.error
      };
      const outputUrl = resultData?.resultUrl || resultData?.url || (Array.isArray(resultData) ? resultData[0] : null);
      return {
        status: true,
        code: 200,
        mode: mode,
        result: outputUrl,
        data: resultData
      };
    } catch (e) {
      return {
        status: false,
        code: 500,
        message: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new MyImgAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}