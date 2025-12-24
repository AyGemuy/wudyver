import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
const BASE_URL = "https://phototovideoai.net/api";
const MAIL_API_URL = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
class PhotoToVideoAI {
  constructor() {
    this.jar = new CookieJar();
    this.sessionEstablished = false;
    const defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: "https://phototovideoai.net",
      referer: "https://phototovideoai.net/",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.axios = wrapper(axios.create({
      jar: this.jar,
      baseURL: BASE_URL,
      headers: defaultHeaders
    }));
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  async _getMail() {
    console.log("Proses: Memulai permintaan email sementara.");
    try {
      const response = await axios.get(MAIL_API_URL, {
        params: {
          action: "create"
        }
      });
      console.log("Respon: Email sementara diterima.", response.data);
      return response.data?.email || null;
    } catch (error) {
      console.error("Kesalahan [getMail]: Gagal membuat email sementara.", {
        message: error.message,
        response: error.response?.data
      });
      throw new Error("Gagal membuat email sementara.");
    }
  }
  async _getMsg(email) {
    console.log(`Proses: Memulai polling untuk OTP di email ${email}.`);
    for (let i = 0; i < 60; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 3e3));
        console.log(`Proses: Polling percobaan ke-${i + 1}...`);
        const response = await axios.get(MAIL_API_URL, {
          params: {
            action: "message",
            email: email
          }
        });
        const content = response.data?.data?.[0]?.text_content;
        if (content) {
          const otp = content.match(/\d{6}/)?.[0];
          if (otp) {
            console.log("Respon: OTP ditemukan.", {
              otp: otp
            });
            return otp;
          }
        }
      } catch (error) {
        console.error(`Kesalahan [getMsg polling]: Gagal memeriksa pesan pada percobaan ke-${i + 1}.`, {
          message: error.message
        });
      }
    }
    console.error("Kesalahan [getMsg]: Waktu polling habis, OTP tidak ditemukan.");
    throw new Error("Gagal mendapatkan kode OTP setelah beberapa percobaan.");
  }
  async _auth() {
    console.log("Proses: Memulai alur otentikasi lengkap.");
    try {
      console.log("Proses: Meminta token CSRF.");
      const csrfResponse = await this.axios.get("/auth/csrf");
      const csrfToken = csrfResponse.data?.csrfToken;
      if (!csrfToken) throw new Error("Token CSRF tidak ditemukan dari respons.");
      console.log("Respon: Token CSRF diterima.");
      const email = await this._getMail();
      if (!email) throw new Error("Gagal mendapatkan email dari layanan mail.");
      console.log("Proses: Mengirim permintaan OTP.");
      await this.axios.post("/auth/otp/request", {
        email: email
      });
      console.log("Respon: Permintaan OTP berhasil dikirim.");
      const otp = await this._getMsg(email);
      console.log("Proses: Memverifikasi OTP.");
      await this.axios.post("/auth/callback/otp", new URLSearchParams({
        email: email,
        code: otp,
        csrfToken: csrfToken,
        redirect: "false"
      }));
      console.log("Respon: Verifikasi OTP berhasil.");
      console.log("Proses: Mengecek status sesi.");
      const sessionData = await this.axios.get("/auth/session");
      if (!sessionData.data?.user) throw new Error("Verifikasi sesi gagal, data pengguna tidak ditemukan.");
      console.log("Respon: Sesi berhasil diverifikasi.", sessionData.data);
      this.sessionEstablished = true;
    } catch (error) {
      console.error("Kesalahan [auth]: Gagal dalam proses otentikasi.", {
        message: error.message,
        response: error.response?.data
      });
      throw new Error("Gagal menyelesaikan proses otentikasi.");
    }
  }
  async _upload(imageUrl) {
    console.log("Proses: Memulai unggah gambar.");
    try {
      let buffer;
      let filename = "upload.png";
      if (Buffer.isBuffer(imageUrl)) {
        buffer = imageUrl;
      } else if (imageUrl.startsWith("http")) {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(response.data);
        filename = imageUrl.split("/").pop() || filename;
      } else {
        buffer = Buffer.from(imageUrl, "base64");
      }
      const formData = new FormData();
      formData.append("file", buffer, filename);
      console.log("Proses: Mengirim gambar ke server.");
      const response = await this.axios.post("/upload", formData, {
        headers: formData.getHeaders()
      });
      console.log("Respon: Gambar berhasil diunggah.", response.data);
      return response.data?.data?.url;
    } catch (error) {
      console.error("Kesalahan [upload]: Gagal mengunggah gambar.", {
        message: error.message,
        response: error.response?.data
      });
      throw new Error("Gagal mengunggah gambar.");
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    console.log("Proses: Memulai tugas 'generate'.");
    try {
      if (!this.sessionEstablished) {
        console.log("Proses: Sesi belum ada, menjalankan otentikasi...");
        await this._auth();
      }
      const model = rest.model || (imageUrl ? "google/nano-banana-edit" : "google/nano-banana");
      let data = {
        prompt: prompt,
        model: model,
        output_format: rest.output_format || "png",
        image_size: rest.image_size || "auto",
        source_path: rest.source_path || (model.includes("edit") ? "/model/nano-banana" : undefined)
      };
      if (imageUrl) {
        console.log("Proses: Mode Image-to-Image, mengunggah gambar terlebih dahulu.");
        const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        const uploadedUrls = [];
        for (const url of imageUrls) {
          try {
            const uploadedUrl = await this._upload(url);
            uploadedUrls.push(uploadedUrl);
          } catch (error) {
            console.error(`Gagal mengunggah gambar dari URL: ${url}`, error);
          }
        }
        if (uploadedUrls.length > 0) {
          data.input_images = uploadedUrls;
        }
      }
      console.log("Proses: Mengirim permintaan generate dengan data:", data);
      const response = await this.axios.post("/images/generate", data);
      console.log("Respon: Tugas generate berhasil dibuat.", response.data);
      const task_id = response.data?.task_id;
      if (!task_id) throw new Error("Gagal mendapatkan task_id dari respons generate.");
      const cookie = await this.jar.getCookieString(BASE_URL);
      const encryptedData = {
        task_id: task_id,
        cookie: cookie
      };
      return await this.enc(encryptedData);
    } catch (error) {
      console.error("Kesalahan [generate]: Gagal membuat tugas.", {
        message: error.message,
        response: error.response?.data
      });
      throw new Error("Gagal memulai proses pembuatan.");
    }
  }
  async status({
    task_id,
    ...rest
  }) {
    const decryptedData = await this.dec(task_id);
    const {
      task_id: taskId,
      cookie
    } = decryptedData;
    if (!taskId || !cookie) {
      throw new Error("Task ID atau cookie yang didekripsi tidak valid.");
    }
    console.log(`Proses: Memulai pemeriksaan status untuk task_id: ${taskId}`);
    try {
      const requestData = {
        task_id: taskId
      };
      let response;
      if (cookie) {
        console.log("Proses: Menggunakan cookie kustom.");
        response = await this.axios.post(`${BASE_URL}/images/tasks`, requestData, {
          headers: {
            ...this.axios.defaults.headers,
            Cookie: cookie
          }
        });
      } else {
        console.log("Proses: Menggunakan sesi dari instance.");
        response = await this.axios.post("/images/tasks", requestData);
      }
      console.log("Respon: Status tugas diterima.", response.data);
      return response.data;
    } catch (error) {
      console.error(`Kesalahan [status]: Gagal memeriksa status tugas.`, {
        message: error.message,
        response: error.response?.data
      });
      throw new Error("Gagal mengambil status tugas.");
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
      error: "Action is required."
    });
  }
  const api = new PhotoToVideoAI();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for generate."
          });
        }
        response = await api.generate(params);
        return res.status(200).json({
          task_id: response
        });
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await api.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'generate', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}