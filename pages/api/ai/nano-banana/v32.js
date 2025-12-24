import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class NanoBanana {
  constructor() {
    this.api = axios.create({
      baseURL: "https://trynanobanana.ai/api",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://trynanobanana.ai",
        referer: "https://trynanobanana.ai/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.mailApi = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`
    });
    this.ratios = ["1:1", "3:2", "2:3", "4:3", "3:4", "4:5", "5:4", "16:9", "9:16", "21:9"];
    this.token = null;
    this.cookies = null;
  }
  validateRatio(ratio) {
    return this.ratios.includes(ratio) ? ratio : "3:4";
  }
  async createMail() {
    try {
      console.log("📧 Membuat email...");
      const {
        data
      } = await this.mailApi.get("", {
        params: {
          action: "create"
        }
      });
      console.log(`✅ Email dibuat: ${data?.email}`);
      return data?.email || null;
    } catch (err) {
      console.error("❌ Gagal membuat email:", err?.message);
      return null;
    }
  }
  async getOtp(email, max = 30, delay = 3e3) {
    console.log("🔍 Menunggu OTP...");
    for (let i = 0; i < max; i++) {
      try {
        const {
          data
        } = await this.mailApi.get("", {
          params: {
            action: "message",
            email: email
          }
        });
        const msg = data?.data?.[0]?.text_content || "";
        const match = msg.match(/verify-email\?token=([^\s]+)/);
        if (match?.[1]) {
          console.log("✅ OTP diterima");
          return match[1];
        }
      } catch (err) {
        console.log(`⏳ Mencoba lagi (${i + 1}/${max})...`);
      }
      await new Promise(r => setTimeout(r, delay));
    }
    console.error("❌ OTP timeout");
    return null;
  }
  async signup(email, pass) {
    try {
      console.log("📝 Registrasi akun...");
      await this.api.post("/auth/sign-up/email", {
        email: email,
        password: pass,
        name: email,
        callbackURL: "/"
      });
      console.log("✅ Registrasi berhasil");
      return true;
    } catch (err) {
      console.error("❌ Gagal registrasi:", err?.message);
      return false;
    }
  }
  async verify(token) {
    try {
      console.log("✔️ Verifikasi email...");
      const {
        headers
      } = await axios.get(`https://trynanobanana.ai/api/auth/verify-email?token=${token}`, {
        maxRedirects: 0,
        validateStatus: s => s >= 200 && s < 400
      });
      const cookies = headers["set-cookie"]?.join("; ") || "";
      this.cookies = cookies;
      this.api.defaults.headers.cookie = cookies;
      console.log("✅ Email terverifikasi");
      return true;
    } catch (err) {
      console.error("❌ Gagal verifikasi:", err?.message);
      return false;
    }
  }
  async getSession() {
    try {
      console.log("🔐 Mengambil sesi...");
      const {
        data
      } = await this.api.get("/auth/get-session");
      this.token = data?.session?.token || null;
      console.log(`✅ Sesi diperoleh: ${data?.user?.email}`);
      return data || null;
    } catch (err) {
      console.error("❌ Gagal ambil sesi:", err?.message);
      return null;
    }
  }
  async checkin() {
    try {
      console.log("🎁 Daily check-in...");
      const {
        data
      } = await this.api.post("/credits/daily-checkin");
      console.log(`✅ Check-in: ${data?.canCheckIn ? "Berhasil" : "Sudah dilakukan"}`);
      return data || null;
    } catch (err) {
      console.error("❌ Gagal check-in:", err?.message);
      return null;
    }
  }
  async getCredits() {
    try {
      const {
        data
      } = await this.api.get("/credits");
      console.log(`💰 Kredit tersedia: ${data?.credits || 0}`);
      return data?.credits || 0;
    } catch (err) {
      console.error("❌ Gagal cek kredit:", err?.message);
      return 0;
    }
  }
  async upload(input) {
    try {
      console.log("📤 Upload gambar...");
      const form = new FormData();
      if (Buffer.isBuffer(input)) {
        form.append("file", input, {
          filename: "image.jpg",
          contentType: "image/jpeg"
        });
      } else if (input.startsWith("data:")) {
        const buf = Buffer.from(input.split(",")[1], "base64");
        form.append("file", buf, {
          filename: "image.jpg",
          contentType: "image/jpeg"
        });
      } else {
        const {
          data: buf
        } = await axios.get(input, {
          responseType: "arraybuffer"
        });
        form.append("file", Buffer.from(buf), {
          filename: "image.jpg",
          contentType: "image/jpeg"
        });
      }
      form.append("folder", "wavespeed/uploads");
      const {
        data
      } = await this.api.post("/storage/upload", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      console.log(`✅ Upload berhasil: ${data?.url}`);
      return data?.url || null;
    } catch (err) {
      console.error("❌ Gagal upload:", err?.message);
      return null;
    }
  }
  async gen(payload) {
    try {
      console.log("🎨 Membuat task generate...");
      const {
        data
      } = await this.api.post("/ai/image/nano-banana/generate", payload);
      console.log(`✅ Task dibuat: ${data?.taskId}`);
      return data?.taskId || null;
    } catch (err) {
      console.error("❌ Gagal generate:", err?.message);
      return null;
    }
  }
  async poll(taskId, max = 60, delay = 3e3) {
    console.log("⏳ Polling status...");
    for (let i = 0; i < max; i++) {
      try {
        const {
          data
        } = await this.api.get(`/ai/image/nano-banana/status/${taskId}`);
        const status = data?.data?.status || "";
        if (status === "done") {
          console.log("✅ Generate selesai!");
          return data?.data || null;
        } else if (status === "failed") {
          console.error("❌ Generate gagal");
          return null;
        }
        console.log(`⏳ Status: ${status} (${i + 1}/${max})...`);
      } catch (err) {
        console.log(`⚠️ Error polling (${i + 1}/${max}):`, err?.message);
      }
      await new Promise(r => setTimeout(r, delay));
    }
    console.error("❌ Polling timeout");
    return null;
  }
  async init() {
    try {
      const email = await this.createMail();
      if (!email) return false;
      if (!await this.signup(email, email)) return false;
      const token = await this.getOtp(email);
      if (!token) return false;
      if (!await this.verify(token)) return false;
      await this.getSession();
      await this.checkin();
      await this.getCredits();
      return true;
    } catch (err) {
      console.error("❌ Init gagal:", err?.message);
      return false;
    }
  }
  async generate({
    prompt,
    imageUrl,
    aspect_ratio = "3:4",
    num_images = 1,
    output_format = "png",
    ...rest
  }) {
    try {
      if (!this.token) {
        console.log("🔄 Inisialisasi akun...");
        if (!await this.init()) throw new Error("Init gagal");
      }
      const ratio = this.validateRatio(aspect_ratio);
      const mode = imageUrl ? "image-editing" : "text-to-image";
      const payload = {
        mode: mode,
        prompt: prompt,
        num_images: num_images,
        aspect_ratio: ratio,
        output_format: output_format,
        provider: "wavespeed",
        ...rest
      };
      if (imageUrl) {
        const urls = [];
        const images = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        for (const img of images) {
          const url = await this.upload(img);
          if (url) {
            urls.push(url);
          } else {
            console.log(`⚠️ Skip gambar: ${img}`);
          }
        }
        if (urls.length === 0) throw new Error("Tidak ada gambar berhasil diupload");
        payload.image_urls = urls;
      }
      const taskId = await this.gen(payload);
      if (!taskId) throw new Error("Generate gagal");
      const result = await this.poll(taskId);
      if (!result) throw new Error("Polling gagal");
      return {
        result: result?.urls || [],
        taskId: result?.taskId,
        model: result?.model,
        provider: result?.provider,
        creditsUsed: result?.creditsUsed,
        completedAt: result?.completedAt,
        metadata: result?.metadata
      };
    } catch (err) {
      console.error("❌ Error:", err?.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new NanoBanana();
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