import axios from "axios";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class Flux {
  constructor() {
    console.log("Proses: Inisialisasi Flux Client...");
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://flux-1.net",
        priority: "u=1, i",
        referer: "https://flux-1.net/nano-banana",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        ...SpoofHead()
      }
    }));
  }
  async getCsrf() {
    console.log("Proses: Mendapatkan CSRF token...");
    try {
      const response = await this.client.get("https://flux-1.net/api/auth/csrf");
      const csrfToken = response.data?.csrfToken;
      if (!csrfToken) throw new Error("Gagal mendapatkan CSRF token dari respons.");
      console.log("Sukses: CSRF token diterima.");
      this.client.defaults.headers.common["x-csrf-token"] = csrfToken;
      return csrfToken;
    } catch (error) {
      console.error("Error [getCsrf]:", error.message);
      throw error;
    }
  }
  async createMail() {
    console.log("Proses: Membuat email sementara...");
    try {
      const response = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      const email = response.data?.email;
      if (!email) throw new Error("Gagal membuat email dari respons.");
      console.log(`Sukses: Email dibuat -> ${email}`);
      return email;
    } catch (error) {
      console.error("Error [createMail]:", error.message);
      throw error;
    }
  }
  async sendCode(email) {
    console.log(`Proses: Mengirim kode verifikasi ke ${email}...`);
    try {
      await this.client.post("https://flux-1.net/api/auth/send-code", {
        email: email
      });
      console.log("Sukses: Kode verifikasi terkirim.");
    } catch (error) {
      console.error("Error [sendCode]:", error.message);
      throw error;
    }
  }
  async checkOtp(email) {
    console.log(`Proses: Polling OTP untuk ${email}...`);
    try {
      for (let i = 0; i < 60; i++) {
        const response = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        const message = response.data?.data?.[0]?.text_content;
        if (message) {
          const otp = message.match(/\d{6}/)?.[0];
          if (otp) {
            console.log(`\nSukses: OTP ditemukan -> ${otp}`);
            return otp;
          }
        }
        process.stdout.write(`...menunggu OTP (percobaan ke-${i + 1})\r`);
        await delay(3e3);
      }
      throw new Error("Gagal mendapatkan OTP setelah beberapa kali percobaan.");
    } catch (error) {
      console.error("\nError [checkOtp]:", error.message);
      throw error;
    }
  }
  async verify(email, token, csrfToken) {
    console.log("Proses: Memverifikasi OTP dan membuat sesi...");
    try {
      const payload = new URLSearchParams({
        email: email,
        code: token,
        redirect: "false",
        callbackUrl: "/nano-banana",
        csrfToken: csrfToken
      });
      await this.client.post("https://flux-1.net/api/auth/callback/credentials", payload.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "x-auth-return-redirect": "1"
        }
      });
      console.log("Sukses: OTP terverifikasi.");
    } catch (error) {
      console.error("Error [verify]:", error.message);
      if (error.response) {
        console.error("Detail Error:", error.response.data);
      }
      throw error;
    }
  }
  async getSession() {
    console.log("Proses: Memvalidasi sesi pengguna...");
    try {
      const response = await this.client.get("https://flux-1.net/api/auth/session");
      if (!response.data?.user) {
        throw new Error("Sesi tidak valid atau gagal diautentikasi.");
      }
      console.log("Sukses: Sesi pengguna valid. Email:", response.data.user.email);
      return response.data;
    } catch (error) {
      console.error("Error [getSession]:", error.message);
      throw error;
    }
  }
  async getPrices() {
    console.log("Proses: Mengambil informasi harga...");
    try {
      const response = await this.client.get("https://flux-1.net/api/prices");
      console.log("Sukses: Informasi harga diterima.");
      return response.data;
    } catch (error) {
      console.error("Error [getPrices]:", error.message);
      throw error;
    }
  }
  async upload(imageUrl) {
    return !imageUrl ? null : await (async () => {
      console.log("Proses: Mengunggah gambar...");
      try {
        let imageBuffer;
        const fileName = "image.png";
        if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
          const response = await this.client.get(imageUrl, {
            responseType: "arraybuffer"
          });
          imageBuffer = Buffer.from(response.data);
        } else if (typeof imageUrl === "string") {
          imageBuffer = Buffer.from(imageUrl, "base64");
        } else if (imageUrl instanceof Buffer) {
          imageBuffer = imageUrl;
        } else {
          throw new Error("Format imageUrl tidak valid.");
        }
        const formData = new FormData();
        formData.append("image", imageBuffer, {
          filename: fileName,
          contentType: "image/png"
        });
        const response = await this.client.post("https://flux-1.net/api/upload-image", formData, {
          headers: formData.getHeaders()
        });
        const uploadedUrl = response.data?.imageUrl;
        if (!uploadedUrl) throw new Error("Gagal mendapatkan URL gambar setelah diunggah.");
        console.log(`Sukses: Gambar diunggah ke -> ${uploadedUrl}`);
        return uploadedUrl;
      } catch (error) {
        console.error("Error [upload]:", error.message);
        throw error;
      }
    })();
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    console.log("\n===== MEMULAI PROSES GENERATE GAMBAR =====");
    try {
      const csrfToken = await this.getCsrf();
      const email = await this.createMail();
      await this.sendCode(email);
      const otp = await this.checkOtp(email);
      await this.verify(email, otp, csrfToken);
      await this.getSession();
      await this.getPrices();
      const uploadedImageUrl = await this.upload(imageUrl);
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("model", rest.model || "nano-banana");
      formData.append("output_format", rest.output_format || "png");
      if (uploadedImageUrl) {
        formData.append("image", uploadedImageUrl);
      }
      console.log("Proses: Mengirim data untuk generasi gambar final...");
      const response = await this.client.post("https://flux-1.net/api/tools/nano-banana", formData, {
        headers: formData.getHeaders()
      });
      console.log("===== PROSES GENERATE SELESAI =====");
      return response.data;
    } catch (error) {
      console.error("\nError [generate]: Operasi gagal total.", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const flux = new Flux();
    const response = await flux.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error("API Error:", error);
    const errorMessage = error.response?.data?.error || error.message || "Internal Server Error";
    return res.status(500).json({
      error: errorMessage
    });
  }
}