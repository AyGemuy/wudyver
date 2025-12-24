import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class NanoBananaAI {
  constructor(options = {}) {
    this.enableLogging = options.log ?? true;
    this.cookieJar = new CookieJar();
    this.session = null;
    this.api = wrapper(axios.create({
      baseURL: "https://nanobananaai.ai/api",
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://nanobananaai.ai",
        referer: "https://nanobananaai.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    }));
    this.supabase = axios.create({
      baseURL: "https://qvkcckvxdltbongpgdvv.supabase.co/auth/v1",
      headers: {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2a2Nja3Z4ZGx0Ym9uZ3BnZHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2OTY2NDIsImV4cCI6MjA3MTI3MjY0Mn0.IAv7Ec3JtvQrtChu2NQ5YeHEgM-SmpbSmnmthTQ_eu4",
        authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2a2Nja3Z4ZGx0Ym9uZ3BnZHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2OTY2NDIsImV4cCI6MjA3MTI3MjY0Mn0.IAv7Ec3JtvQrtChu2NQ5YeHEgM-SmpbSmnmthTQ_eu4",
        "x-client-info": "supabase-ssr/0.6.1 createBrowserClient",
        "x-supabase-api-version": "2024-01-01"
      }
    });
  }
  log(message) {
    if (this.enableLogging) console.log(`[LOG] ${new Date().toISOString()} - ${message}`);
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
  async _handleImageUrl(imageUrl) {
    this.log(`Memulai proses penanganan URL gambar: ${imageUrl.substring(0, 100)}...`);
    if (imageUrl.startsWith("data:image/")) {
      this.log("Gambar sudah dalam format Base64.");
      return imageUrl;
    }
    if (imageUrl.startsWith("http")) {
      try {
        this.log("Mengunduh gambar dari URL...");
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        const base64 = Buffer.from(response.data).toString("base64");
        const finalString = `data:${response.headers["content-type"]};base64,${base64}`;
        this.log("✅ Gambar berhasil diunduh dan dikonversi ke Base64.");
        return finalString;
      } catch (error) {
        this.log(`❌ Gagal mengunduh atau memproses gambar dari URL: ${error.message}`);
        throw new Error(`Gagal mengunduh gambar dari URL: ${imageUrl}`);
      }
    }
    throw new Error("Format imageUrl tidak valid.");
  }
  parseUserFromCookie() {
    this.log("Mencoba mem-parsing data user dari cookie...");
    try {
      const cookies = this.cookieJar.getCookiesSync("https://nanobananaai.ai");
      const authCookie = cookies.find(c => c.key.startsWith("sb-") && c.key.includes("-auth-token"));
      if (authCookie?.value.startsWith("base64-")) {
        const decoded = JSON.parse(Buffer.from(authCookie.value.replace("base64-", ""), "base64").toString("utf8"));
        if (decoded?.user?.id) {
          this.log(`✅ User ID '${decoded.user.id}' berhasil diekstrak dari cookie.`);
          return decoded.user;
        }
      }
      this.log("⚠️ Gagal menemukan data user yang valid di dalam cookie.");
      return null;
    } catch (error) {
      this.log(`❌ Terjadi error saat mem-parsing cookie: ${error.message}`);
      return null;
    }
  }
  async authenticate() {
    if (this.session) {
      this.log("Sesi sudah ada, proses otentikasi dilewati.");
      return this.session;
    }
    this.log("--- Memulai Proses Otentikasi Baru ---");
    try {
      this.log("Langkah 1: Membuat email sementara...");
      const tempMailRes = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      const email = tempMailRes.data?.email;
      if (!email) throw new Error("API tidak mengembalikan email.");
      this.log(`✅ Email sementara dibuat: ${email}`);
      this.log("Langkah 2: Meminta pengiriman OTP...");
      await this.supabase.post("/otp", {
        email: email,
        create_user: true
      });
      this.log("✅ Permintaan OTP berhasil dikirim.");
      this.log("Langkah 3: Menunggu dan mengambil OTP...");
      const verificationCode = await this.pollForOtp(email);
      this.log(`✅ OTP diterima: ${verificationCode}`);
      this.log("Langkah 4: Memverifikasi OTP...");
      await this.api.post("/auth/verificationCode", {
        email: email,
        verificationCode: String(verificationCode)
      });
      this.log("✅ Verifikasi OTP berhasil.");
      this.log("Langkah 5: Mengekstrak User ID dari cookie...");
      const cookieUser = this.parseUserFromCookie();
      if (!cookieUser?.id) throw new Error("Gagal mendapatkan user ID dari cookie.");
      this.log("Langkah 6: Mengambil informasi lengkap user dari API...");
      const fullUserInfo = await this.getUserInfo(cookieUser.id);
      this.log("Langkah 7: Menyusun objek sesi...");
      this.session = {
        userId: fullUserInfo.user_id,
        email: fullUserInfo.user_email,
        ...fullUserInfo
      };
      this.session.cookieJar = this.cookieJar.toJSON();
      this.log("✅ Sesi berhasil dibuat dan cookie disimpan.");
      this.log("--- Proses Otentikasi Berhasil Diselesaikan ---");
      return this.session;
    } catch (error) {
      this.log(`❌ Gagal total pada proses otentikasi: ${error.message}`);
      this.session = null;
      throw error;
    }
  }
  async getUserInfo(userId) {
    this.log(`Memanggil API /user dengan User ID: ${userId}`);
    if (!userId) throw new Error("User ID tidak boleh kosong.");
    try {
      const response = await this.api.post("/user", {
        user_id: userId
      });
      if (response.data?.data) {
        this.log("✅ Informasi user berhasil didapatkan dari API.");
        return response.data.data;
      }
      throw new Error("Format respons API /user tidak valid.");
    } catch (error) {
      this.log(`❌ Gagal saat memanggil API /user: ${error.message}`);
      throw error;
    }
  }
  async pollForOtp(email, maxAttempts = 60, interval = 3e3) {
    this.log(`Memulai polling untuk OTP di email ${email}...`);
    for (let i = 0; i < maxAttempts; i++) {
      this.log(`Percobaan polling ke-${i + 1}/${maxAttempts}...`);
      try {
        const checkMailRes = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        const otpMatch = checkMailRes.data?.data?.[0]?.text_content?.match(/\b(\d{6})\b/);
        if (otpMatch?.[1]) {
          this.log("✅ OTP ditemukan.");
          return otpMatch[1];
        }
      } catch (error) {
        this.log(`⚠️ Peringatan saat polling: ${error.message}. Melanjutkan...`);
      }
      await sleep(interval);
    }
    throw new Error("Batas waktu untuk mendapatkan OTP terlampaui.");
  }
  async uploadImage(base64Image) {
    this.log("Memulai proses upload gambar...");
    try {
      if (!this.session) await this.authenticate();
      const mimeType = base64Image.substring(base64Image.indexOf(":") + 1, base64Image.indexOf(";"));
      const response = await this.api.post("/upload/images", {
        images: [base64Image],
        mimeTypes: [mimeType]
      });
      if (!response.data?.url) throw new Error("API tidak mengembalikan URL gambar.");
      this.log(`✅ Gambar berhasil diunggah ke: ${response.data.url}`);
      return response.data.url;
    } catch (error) {
      this.log(`❌ Gagal saat mengunggah gambar: ${error.message}`);
      throw error;
    }
  }
  async generate(payload) {
    this.log(`Memulai proses generate untuk mode: "${payload.mode}"`);
    try {
      if (!this.session) await this.authenticate();
      const finalPayload = {
        ...payload,
        user_id: this.session.userId,
        user_email: this.session.email
      };
      this.log("Mengirim permintaan ke API /generate/nano-banana...");
      const response = await this.api.post("/generate/nano-banana", finalPayload);
      this.log(`✅ Task berhasil dibuat dengan ID: ${response.data?.taskId}`);
      const encryptedData = {
        taskId: response.data?.taskId,
        session: this.session,
        cookie: this.session.cookieJar
      };
      return await this.enc(encryptedData);
    } catch (error) {
      this.log(`❌ Gagal saat proses generate: ${error.message}`);
      throw error;
    }
  }
  async txt2img({
    prompt,
    ...rest
  }) {
    this.log(`Memulai tugas txt2img dengan prompt: "${prompt}"`);
    return await this.generate({
      prompt: prompt,
      inputImages: [],
      numImages: "1",
      mode: "text-to-image",
      ...rest
    });
  }
  async img2img({
    prompt,
    imageUrl,
    ...rest
  }) {
    this.log(`Memulai tugas img2img dengan prompt: "${prompt}"`);
    try {
      const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      this.log(`Memproses ${imageUrls.length} gambar input secara berurutan...`);
      const uploadedImageUrls = [];
      for (const url of imageUrls) {
        const base64DataUri = await this._handleImageUrl(url);
        const uploadedUrl = await this.uploadImage(base64DataUri);
        uploadedImageUrls.push(uploadedUrl);
      }
      this.log("Semua gambar berhasil diunggah.");
      return await this.generate({
        prompt: prompt,
        inputImages: uploadedImageUrls,
        numImages: uploadedImageUrls.length.toString(),
        mode: "image-edit",
        ...rest
      });
    } catch (error) {
      this.log(`❌ Gagal pada alur img2img: ${error.message}`);
      throw error;
    }
  }
  async status({
    task_id
  }) {
    const decryptedData = await this.dec(task_id);
    const {
      taskId,
      session,
      cookie
    } = decryptedData;
    if (!cookie || !taskId) {
      throw new Error("Membutuhkan taskId dan cookie untuk memeriksa status.");
    }
    this.log(`Mempersiapkan pemeriksaan status untuk Task ID: ${taskId}`);
    try {
      if (!this.session && session && cookie) {
        this.log("Sesi internal tidak ada. Mengadopsi sesi yang disediakan...");
        this.cookieJar = CookieJar.fromJSON(JSON.stringify(cookie));
        this.api.defaults.jar = this.cookieJar;
        this.session = session;
        this.log("✅ Sesi berhasil diadopsi.");
      }
      if (!this.session) throw new Error("Sesi tidak valid untuk memeriksa status.");
      this.log(`Mengirim permintaan status untuk Task ID: ${taskId}`);
      const response = await this.api.get(`/generate/nano-banana?taskId=${taskId}`);
      this.log(`✅ Status diterima: ${response.data.status}`);
      return response.data;
    } catch (error) {
      this.log(`❌ Gagal memeriksa status: ${error.message}`);
      throw error;
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
  const api = new NanoBananaAI();
  try {
    let response;
    switch (action) {
      case "img2img":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for img2img."
          });
        }
        response = await api.img2img(params);
        return res.status(200).json({
          task_id: response
        });
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2img."
          });
        }
        response = await api.txt2img(params);
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
          error: `Invalid action: ${action}. Supported actions are 'img2img', 'txt2img', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}