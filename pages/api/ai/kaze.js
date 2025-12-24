import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import PROMPT from "@/configs/ai-prompt";
class KazeAI {
  constructor() {
    this.key = "AIzaSyC3hx8Nwe1KldaC3rvbTvPAT4mzPI5-rPI";
    this.baseAuth = "https://identitytoolkit.googleapis.com/v1/accounts";
    this.baseComm = "https://kaze-ai-comm-srv-898747634367.us-central1.run.app/comm_api";
    this.basePython = "https://kaze-ai-python-898747634367.us-central1.run.app/api";
    this.token = null;
    this.user = null;
    this.deviceId = this.genId();
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      jar: this.jar
    }));
    this.VALID_MODES = ["edit", "generate", "remove", "upscale", "restore"];
  }
  genId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  getHeaders(extra = {}) {
    return {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: "https://kaze.ai",
      priority: "u=1, i",
      referer: "https://kaze.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-device-id": this.deviceId,
      ...extra
    };
  }
  async signup() {
    try {
      const {
        data
      } = await this.http.post(`${this.baseAuth}:signUp?key=${this.key}`, {
        returnSecureToken: true
      }, {
        headers: this.getHeaders({
          "content-type": "application/json"
        })
      });
      this.token = data?.idToken;
      return data;
    } catch (e) {
      throw e;
    }
  }
  async lookup() {
    try {
      await this.http.post(`${this.baseAuth}:lookup?key=${this.key}`, {
        idToken: this.token
      }, {
        headers: this.getHeaders({
          "content-type": "application/json"
        })
      });
    } catch (e) {}
  }
  async register() {
    try {
      const {
        data
      } = await this.http.post(`${this.basePython}/users/v1/me`, {
        invite_code: null
      }, {
        headers: this.getHeaders({
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json"
        })
      });
      this.user = data;
      return data;
    } catch (e) {
      throw e;
    }
  }
  checkQuota(data) {
    const available = data?.plan?.available_count || 0;
    return {
      available: available,
      hasQuota: available > 0
    };
  }
  async ensureToken() {
    if (this.token && this.user && this.checkQuota(this.user).hasQuota) return;
    console.log("🔄 [Auth] Mencari akun dengan kuota tersedia...");
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        this.deviceId = this.genId();
        this.jar.removeAllCookiesSync();
        this.token = null;
        await this.signup();
        await this.lookup();
        const userData = await this.register();
        const quota = this.checkQuota(userData);
        if (quota.hasQuota) {
          console.log(`✅ [Auth] Akun ditemukan! Sisa kredit: ${quota.available}`);
          this.user = userData;
          break;
        } else {}
      } catch (e) {
        await new Promise(r => setTimeout(r, 1e3));
      }
    }
  }
  async upload(img) {
    try {
      await this.ensureToken();
      console.log("📤 [Upload] Mengunggah gambar ke server...");
      const {
        data: urlData
      } = await this.http.post(`${this.baseComm}/file/v1/batch_get_upload_url`, {
        upload_list: [{
          extension: "jpg",
          content_type: "image/jpeg"
        }]
      }, {
        headers: this.getHeaders({
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json"
        })
      });
      const uploadUrl = urlData?.upload_result?.[0]?.upload_url;
      const fileId = urlData?.upload_result?.[0]?.file_id;
      let buf;
      if (Buffer.isBuffer(img)) buf = img;
      else if (img.startsWith("http")) {
        const {
          data
        } = await axios.get(img, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(data);
      } else {
        buf = Buffer.from(img, "base64");
      }
      await axios.put(uploadUrl, buf, {
        headers: {
          "content-type": "image/jpeg"
        }
      });
      console.log("✅ [Upload] Berhasil. File ID:", fileId);
      return fileId;
    } catch (e) {
      console.error("❌ [Upload] Gagal:", e.message);
      throw e;
    }
  }
  async executeTaskRequest(url, payload) {
    try {
      await this.ensureToken();
      console.log("🚀 [Task] Mengirim request task...");
      const {
        data
      } = await this.http.post(url, payload, {
        headers: this.getHeaders({
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json"
        })
      });
      return data?.task_ids || [];
    } catch (e) {
      if (e?.response?.data?.error?.code === "BUSINESS_QUOTA_EXCEEDED" || e?.response?.status === 429) {
        console.warn("⚠️ [Task] Kuota habis di tengah jalan. Mengganti akun...");
        this.token = null;
        this.user = null;
        return await this.executeTaskRequest(url, payload);
      }
      throw e;
    }
  }
  async wait(ids) {
    console.log("⏳ [Poll] Menunggu hasil task...");
    const start = Date.now();
    while (Date.now() - start < 12e4) {
      try {
        const {
          data
        } = await this.http.post(`${this.basePython}/toolkit/v1/get_task_result`, {
          task_ids: ids
        }, {
          headers: this.getHeaders({
            authorization: `Bearer ${this.token}`,
            "content-type": "application/json"
          })
        });
        const done = data?.tasks?.filter(t => t?.task_status === "success");
        if (done?.length === ids.length) {
          console.log("✅ [Poll] Task selesai!");
          return done.map(t => ({
            id: t?.task_id,
            status: t?.task_status,
            url: t?.task_result?.[0]?.access_url,
            thumb: t?.task_result?.[0]?.thumbnail_url,
            originalUrl: t?.task_result?.[0]?.origin_file_url
          }));
        }
        const failed = data?.tasks?.find(t => t?.task_status === "failed");
        if (failed) throw new Error(`Task gagal di server: ${failed.task_status_msg || "Unknown"}`);
        await new Promise(r => setTimeout(r, 2e3));
      } catch (e) {
        throw e;
      }
    }
    throw new Error("Timeout: Waktu tunggu habis.");
  }
  async generate({
    mode = "edit",
    imageUrl = null,
    prompt = PROMPT.text,
    count = 1,
    colorization = true,
    ...rest
  }) {
    if (!imageUrl) {
      console.error("❌ [Validation] imageUrl kosong.");
      return {
        status: false,
        error: "MISSING_PARAMETER",
        message: "Parameter 'imageUrl' wajib diisi untuk semua mode.",
        required: "imageUrl"
      };
    }
    if (!this.VALID_MODES.includes(mode)) {
      console.error(`❌ [Validation] Mode '${mode}' tidak valid.`);
      return {
        status: false,
        error: "INVALID_MODE",
        message: `Mode '${mode}' tidak ditemukan.`,
        available_modes: this.VALID_MODES
      };
    }
    try {
      const fileId = await this.upload(imageUrl);
      let url, payload;
      console.log(`🛠️ [Setup] Menyiapkan mode: ${mode.toUpperCase()}`);
      switch (mode) {
        case "edit":
        case "generate":
          url = `${this.basePython}/toolkit/v2/chat_edit`;
          payload = {
            prompt: "",
            is_template_prompt: false,
            image_count: count,
            tag_prompt_list: [{
              type: "text",
              content: prompt
            }],
            file_list: [{
              image_file: {
                file_id: fileId
              }
            }],
            ...rest
          };
          break;
        case "remove":
          url = `${this.basePython}/toolkit/v1/batch_background_removal`;
          payload = {
            file_list: [{
              image_file: {
                file_id: fileId,
                width: 0,
                height: 0
              }
            }],
            sub_module: "png_maker"
          };
          break;
        case "upscale":
          url = `${this.basePython}/toolkit/v1/batch_upscale`;
          payload = {
            file_list: [{
              image_file: {
                file_id: fileId,
                width: 0,
                height: 0
              }
            }]
          };
          break;
        case "restore":
          url = `${this.basePython}/toolkit/v1/batch_restoration`;
          payload = {
            file_list: [{
              image_file: {
                file_id: fileId,
                width: 1024,
                height: 1024
              }
            }],
            ai_colorization: colorization
          };
          break;
      }
      const taskIds = await this.executeTaskRequest(url, payload);
      const results = await this.wait(taskIds);
      return {
        status: true,
        mode: mode,
        result: results.length === 1 ? results[0] : results
      };
    } catch (e) {
      console.error(`❌ [Error] Proses gagal:`, e.message);
      return {
        status: false,
        error: "PROCESS_FAILED",
        message: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new KazeAI();
  try {
    const data = await api.generate(params);
    const code = data.status ? 200 : 400;
    return res.status(code).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}