import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class AiUndress {
  constructor() {
    this.baseUrl = "https://ai-undress.ai/api/trpc";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://ai-undress.ai",
      referer: "https://ai-undress.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-trpc-source": "client"
    };
    this.token = null;
  }
  log(msg) {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [AiUndress] ${msg}`);
  }
  async request(endpoint, payload = {}, params = {
    batch: 1
  }) {
    const url = `${this.baseUrl}/${endpoint}`;
    try {
      const cookieStr = this.token ? `auth_session=${this.token}; NEXT_LOCALE=id` : `NEXT_LOCALE=id`;
      const res = await axios.post(url, payload, {
        params: params,
        headers: {
          ...this.headers,
          cookie: cookieStr
        }
      });
      const jsonResponse = res.data?.[0]?.result?.data?.json;
      if (!jsonResponse && !res.data?.[0]?.result) {
        throw new Error("Empty or Invalid TRPC Response");
      }
      return jsonResponse;
    } catch (e) {
      const errMsg = e.response?.data?.[0]?.error?.message || e.message;
      throw new Error(`ReqErr [${endpoint}]: ${errMsg}`);
    }
  }
  async getBuffer(source) {
    try {
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string" && source.startsWith("http")) {
        const res = await axios.get(source, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      if (typeof source === "string" && source.startsWith("data:")) {
        return Buffer.from(source.split(",")[1], "base64");
      }
      return null;
    } catch (e) {
      this.log(`Gagal mengambil gambar: ${e.message}`);
      return null;
    }
  }
  async getTempEmail() {
    this.log("Membuat email sementara...");
    const {
      data
    } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
    if (!data?.email) throw new Error("Gagal membuat temp mail");
    return data.email;
  }
  async waitForOtp(email) {
    this.log(`Menunggu OTP masuk ke ${email} (max 60s)...`);
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(r => setTimeout(r, 3e3));
      try {
        const {
          data: {
            data
          }
        } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        if (Array.isArray(data)) {
          for (const msg of data) {
            const content = (msg.text_content || msg.body || "").toString();
            if (content.includes("AIUndress")) {
              const match = content.match(/\b\d{6}\b/);
              if (match) return match[0];
            }
          }
        }
      } catch (e) {}
      attempts++;
    }
    throw new Error("OTP Timeout: Tidak menerima kode verifikasi.");
  }
  async register() {
    try {
      const email = await this.getTempEmail();
      this.log(`Email didapat: ${email}`);
      const signupPayload = {
        0: {
          json: {
            email: email,
            password: email,
            callbackUrl: "https://ai-undress.ai/auth/verify",
            utmSource: null,
            utmMedium: null,
            utmCampaign: null,
            utmContent: null,
            clickId: null
          },
          meta: {
            values: {
              utmSource: ["undefined"],
              utmMedium: ["undefined"],
              utmCampaign: ["undefined"],
              utmContent: ["undefined"],
              clickId: ["undefined"]
            }
          }
        }
      };
      await this.request("auth.signup", signupPayload);
      const otp = await this.waitForOtp(email);
      this.log(`OTP Diterima: ${otp}`);
      const verifyPayload = {
        0: {
          json: {
            code: otp,
            type: "SIGNUP",
            identifier: email
          }
        }
      };
      const verifyData = await this.request("auth.verifyOtp", verifyPayload);
      if (verifyData?.id) {
        this.token = verifyData.id;
        this.log(`Login Berhasil! Token baru: ${this.token.substring(0, 10)}...`);
        return this.token;
      } else {
        throw new Error("Respon verifikasi tidak mengandung Session ID.");
      }
    } catch (e) {
      throw new Error(`Registrasi Gagal: ${e.message}`);
    }
  }
  async uploadImage(buffer) {
    this.log("Memulai proses upload...");
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(7);
    const filename = `${timestamp}-${rand}.png`;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const path = `materials/${dateStr}/${filename}`;
    const signPayload = {
      0: {
        json: {
          path: path
        }
      }
    };
    const signedUrl = await this.request("uploads.signedUploadUrl", signPayload);
    if (!signedUrl) throw new Error("Gagal mendapatkan URL upload.");
    this.log("Mengunggah file ke storage...");
    await axios.put(signedUrl, buffer, {
      headers: {
        "Content-Type": "image/png"
      }
    });
    this.log("Mendaftarkan material...");
    const cdnUrl = `https://cdn.ai-undress.ai/${path}`;
    const materialPayload = {
      0: {
        json: {
          url: cdnUrl,
          format: "photo"
        }
      }
    };
    const materialData = await this.request("material.createMaterial", materialPayload);
    return materialData.url || cdnUrl;
  }
  async runTask(materialUrl, prompt = "") {
    this.log("Mengirim tugas generate...");
    const payload = {
      0: {
        json: {
          businessType: "runpod_clothes_prompt_changer_auto_undress",
          apiParams: {
            url: materialUrl,
            pose: "runpod_clothes_prompt_changer_auto_undress",
            prompt: prompt
          }
        }
      }
    };
    const data = await this.request("workflow.runTask", payload);
    if (!data?.taskId) throw new Error("Gagal mendapatkan Task ID.");
    return data.taskId;
  }
  async pollResult(taskId) {
    this.log(`Menunggu hasil (Task ID: ${taskId})...`);
    const payload = {
      0: {
        json: {
          taskId: taskId
        }
      }
    };
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(r => setTimeout(r, 3e3));
      try {
        const data = await this.request("workflow.getOrderTaskResult", payload);
        if (data?.status === "COMPLETED") {
          this.log("Status: COMPLETED");
          return data;
        } else if (data?.status === "FAILED") {
          throw new Error("Server menyatakan Task GAGAL.");
        }
      } catch (e) {
        if (attempts % 5 === 0) this.log(`Polling retry... (${e.message})`);
      }
      attempts++;
    }
    throw new Error("Waktu habis (Timeout) saat menunggu hasil.");
  }
  async generate({
    token,
    imageUrl,
    prompt = "",
    ...rest
  }) {
    this.log("--- Memulai Generate ---");
    try {
      if (token) {
        this.token = token;
        this.log("Menggunakan token dari parameter.");
      }
      if (!this.token) {
        this.log("Token tidak ditemukan, melakukan Auto Register...");
        await this.register();
      }
      const buffer = await this.getBuffer(imageUrl);
      if (!buffer) throw new Error("Input gambar tidak valid (harus URL atau Buffer).");
      const validMaterialUrl = await this.uploadImage(buffer);
      this.log(`URL Material Siap: ${validMaterialUrl}`);
      const taskId = await this.runTask(validMaterialUrl, prompt);
      const finalData = await this.pollResult(taskId);
      this.log("Generate Selesai!");
      return {
        result: finalData.result_url,
        token: this.token,
        taskId: taskId,
        status: finalData.status,
        orderStatus: finalData.orderStatus
      };
    } catch (error) {
      this.log(`CRITICAL ERROR: ${error.message}`);
      return {
        result: null,
        token: this.token,
        error: error.message
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
  const api = new AiUndress();
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