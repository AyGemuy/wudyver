import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import PROMPT from "@/configs/ai-prompt";
class FashionPhoto {
  constructor() {
    this.baseUrl = "https://api.fashionphoto.ai/v1";
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.clientId = `GA1.1.${Date.now()}.${Math.floor(Math.random() * 1e9)}`;
    this.commonHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "client-id": this.clientId,
      "content-type": "application/json",
      language: "en",
      origin: "https://www.ifoto.ai",
      priority: "u=1, i",
      referer: "https://www.ifoto.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": this.userAgent
    };
    this.token = null;
    this.userId = null;
  }
  log(msg) {
    console.log(`[FashionPhoto] ${new Date().toLocaleTimeString()} -> ${msg}`);
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      this.log("Memulai proses generate...");
      if (!this.token) await this.login();
      const imageBuffer = await this.processImageInput(imageUrl);
      const uploadedUrl = await this.uploadFile(imageBuffer);
      const taskId = await this.submitTask(uploadedUrl, prompt);
      const result = await this.pollTask(taskId);
      this.log("Proses selesai.");
      return result;
    } catch (error) {
      this.log(`Error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async login() {
    const randomEmail = `${crypto.randomUUID()}@emailhook.site`;
    const ts = Date.now();
    const adInfosDto = {
      facebook: {
        fbPixId: Math.floor(Math.random() * 1e15).toString(),
        fbc: `fb.1.${ts}.${crypto.randomBytes(8).toString("hex")}`,
        fbp: `fb.1.${ts}.${Math.floor(Math.random() * 1e9)}`
      },
      ga: {
        gaCid: this.clientId.replace("GA1.1.", ""),
        gclid: crypto.randomBytes(12).toString("hex"),
        wbraid: null
      },
      clarity: {
        clarityId: crypto.randomBytes(6).toString("hex") + "^" + crypto.randomBytes(2).toString("hex")
      }
    };
    this.log(`Login sebagai: ${randomEmail}`);
    try {
      const {
        data
      } = await axios.post(`${this.baseUrl}/user-session/email/direct`, {
        email: randomEmail,
        channel: null,
        keyword: null,
        referer: "https://www.google.com/",
        adInfosDto: adInfosDto
      }, {
        headers: {
          ...this.commonHeaders,
          "rc-action": "login"
        }
      });
      this.token = data?.obj?.token;
      this.userId = data?.obj?.user?.id;
      if (!this.token) throw new Error("Token tidak ditemukan dalam respon login");
      this.log("Login berhasil.");
    } catch (e) {
      throw new Error(`Gagal Login: ${e.response?.data?.msg || e.message}`);
    }
  }
  async processImageInput(input) {
    this.log("Memproses input gambar...");
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (input.includes("base64")) {
          return Buffer.from(input.split(",").pop(), "base64");
        }
      }
      throw new Error("Input gambar harus berupa URL, Base64, atau Buffer");
    } catch (e) {
      throw new Error(`Gagal memproses gambar: ${e.message}`);
    }
  }
  async uploadFile(buffer) {
    this.log("Request signature upload...");
    const sigRes = await axios.get(`${this.baseUrl}/file/notAuthSignature/mannequin`, {
      headers: {
        ...this.commonHeaders,
        "rc-action": "signature"
      }
    });
    const sigData = sigRes.data?.obj;
    if (!sigData) throw new Error("Gagal mendapatkan signature");
    const fileName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.png`;
    const key = `${sigData.dir}/${fileName}`;
    this.log(`Mengupload ke OSS: ${sigData.host}`);
    const form = new FormData();
    form.append("key", key);
    form.append("policy", sigData.policy);
    form.append("OSSAccessKeyId", sigData.accessid);
    form.append("success_action_status", "200");
    form.append("signature", sigData.signature);
    form.append("file", buffer, {
      filename: fileName,
      contentType: "image/png"
    });
    await axios.post(sigData.host, form, {
      headers: form.getHeaders()
    });
    const fileUrl = `${sigData.host}/${key}`;
    this.log(`Upload selesai: ${fileUrl}`);
    return fileUrl;
  }
  async submitTask(imageUrl, prompt) {
    this.log("Mengirim task generasi AI...");
    const payload = {
      function: "",
      credits: 20,
      params: {
        input_image: imageUrl,
        prompt: prompt || PROMPT.text
      }
    };
    const {
      data
    } = await axios.post(`${this.baseUrl}/ai-function/avatar_generation`, payload, {
      headers: {
        ...this.commonHeaders,
        token: this.token,
        "rc-action": "function"
      }
    });
    const taskId = data?.obj?.id;
    if (!taskId) throw new Error("Gagal membuat task (No ID returned)");
    this.log(`Task ID: ${taskId}`);
    return taskId;
  }
  async pollTask(taskId) {
    this.log("Menunggu hasil (polling)...");
    let attempts = 0;
    const maxAttempts = 60;
    while (attempts < maxAttempts) {
      try {
        const {
          data
        } = await axios.get(`${this.baseUrl}/ai-function-record/detail/${taskId}`, {
          headers: {
            ...this.commonHeaders,
            token: this.token
          }
        });
        const obj = data?.obj || {};
        const status = obj.dealStatus;
        if (status === 2) {
          const resultUrl = obj.aiFunctionResultVos?.[0]?.info?.imgUrl;
          this.log(`Task Sukses! Hasil: ${resultUrl}`);
          return {
            success: true,
            result: resultUrl,
            details: obj
          };
        }
        if (status !== 0 && status !== 2) {
          this.log(`Task belum selesai dengan status: ${status}`);
        }
        await new Promise(r => setTimeout(r, 3e3));
        attempts++;
      } catch (e) {
        this.log(`Polling retry... (${e.message})`);
        await new Promise(r => setTimeout(r, 2e3));
        attempts++;
      }
    }
    throw new Error("Timeout polling task");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new FashionPhoto();
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