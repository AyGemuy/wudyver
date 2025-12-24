import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class PixelfoxClient {
  constructor() {
    this.baseURL = "https://api.pixelfox.ai";
    this.tempMailURL = `https://${apiConfig.DOMAIN_URL}/api/mails/v13`;
    this.token = null;
    this.userInfo = null;
    this.email = null;
    this.algoTypeOptions = [{
      value: "anime",
      label: "Anime"
    }, {
      value: "3d",
      label: "3D"
    }, {
      value: "handdrawn",
      label: "Hand Drawn"
    }, {
      value: "sketch",
      label: "Sketch"
    }, {
      value: "artstyle",
      label: "Art Style"
    }, {
      value: "hongkong",
      label: "Hong Kong"
    }, {
      value: "comic",
      label: "Comic"
    }, {
      value: "animation3d",
      label: "Animation 3D"
    }];
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      language: "en",
      origin: "https://pixelfox.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://pixelfox.ai/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        ...this.headers,
        "content-type": "application/json"
      }
    });
  }
  async createTempEmail() {
    try {
      const response = await axios.get(`${this.tempMailURL}?action=create`);
      if (response.data.code === 0) {
        this.email = response.data.data.address;
        console.log(`Email sementara dibuat: ${this.email}`);
        return this.email;
      } else {
        throw new Error("Gagal membuat email sementara");
      }
    } catch (error) {
      console.error("Error membuat email sementara:", error.message);
      throw error;
    }
  }
  async checkOTP() {
    if (!this.email) {
      throw new Error("Email belum dibuat. Panggil createTempEmail() terlebih dahulu.");
    }
    try {
      const response = await axios.get(`${this.tempMailURL}?action=message&email=${encodeURIComponent(this.email)}`);
      if (response.data.code === 0 && response.data.data.rows.length > 0) {
        const verificationEmail = response.data.data.rows.find(email => email.subject.includes("verification code") || email.subject.includes("kode verifikasi") || email.messageFrom.includes("pixelfox"));
        if (verificationEmail) {
          const otpMatch = verificationEmail.html.match(/\b\d{4,6}\b/);
          if (otpMatch) {
            return otpMatch[0];
          }
          const otpMatch2 = verificationEmail.html.match(/code.*?(\d{4,6})/i);
          if (otpMatch2) {
            return otpMatch2[1];
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Error memeriksa OTP:", error.message);
      throw error;
    }
  }
  async waitForOTP(maxAttempts = 60, delay = 3e3) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      console.log(`Memeriksa OTP (percobaan ${attempt + 1}/${maxAttempts})...`);
      const otp = await this.checkOTP();
      if (otp) {
        console.log(`OTP ditemukan: ${otp}`);
        return otp;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error("Gagal mendapatkan OTP dalam batas waktu yang ditentukan");
  }
  async sendVerificationEmail() {
    if (!this.email) {
      throw new Error("Email belum dibuat. Panggil createTempEmail() terlebih dahulu.");
    }
    try {
      const response = await this.client.post("/api/ems/send", {
        email: this.email,
        event: "register"
      });
      if (response.data.code === 1) {
        console.log("Email verifikasi berhasil dikirim");
        return true;
      } else {
        throw new Error("Gagal mengirim email verifikasi: " + response.data.msg);
      }
    } catch (error) {
      console.error("Error mengirim email verifikasi:", error.message);
      throw error;
    }
  }
  async register(otp, password = "AyGemuy24@e33eer") {
    if (!this.email) {
      throw new Error("Email belum dibuat. Panggil createTempEmail() terlebih dahulu.");
    }
    try {
      const response = await this.client.post("/api/user/register", {
        iviter_code: "",
        bid_identification: "",
        account: this.email,
        code: otp,
        password: password
      });
      if (response.data.code === 1) {
        this.token = response.data.data.userinfo.token;
        this.userInfo = response.data.data.userinfo;
        this.client.defaults.headers.common["token"] = this.token;
        console.log("Registrasi berhasil. Token:", this.token);
        return this.userInfo;
      } else {
        throw new Error("Gagal registrasi: " + response.data.msg);
      }
    } catch (error) {
      console.error("Error registrasi:", error.message);
      throw error;
    }
  }
  async autoAuth() {
    try {
      await this.createTempEmail();
      await this.sendVerificationEmail();
      const otp = await this.waitForOTP();
      await this.register(otp);
      console.log("Autentikasi otomatis berhasil");
      return true;
    } catch (error) {
      console.error("Error autentikasi otomatis:", error.message);
      throw error;
    }
  }
  async processImageInput(imageUrl) {
    if (!imageUrl) {
      throw new Error("imageUrl diperlukan");
    }
    if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
      try {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          timeout: 3e4
        });
        return {
          buffer: Buffer.from(response.data),
          filename: "image.jpg",
          contentType: "image/jpeg"
        };
      } catch (error) {
        console.error("Error mengunduh gambar dari URL:", error.message);
        throw new Error("Gagal mengunduh gambar dari URL: " + error.message);
      }
    } else if (typeof imageUrl === "string" && imageUrl.startsWith("data:image")) {
      try {
        const matches = imageUrl.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new Error("Format base64 tidak valid");
        }
        const contentType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");
        return {
          buffer: buffer,
          filename: `image.${contentType.split("/")[1] || "jpg"}`,
          contentType: `image/${contentType}`
        };
      } catch (error) {
        console.error("Error memproses base64:", error.message);
        throw new Error("Gagal memproses gambar base64: " + error.message);
      }
    } else if (Buffer.isBuffer(imageUrl)) {
      return {
        buffer: imageUrl,
        filename: "image.jpg",
        contentType: "image/jpeg"
      };
    } else {
      throw new Error("Format imageUrl tidak didukung. Gunakan URL, base64, atau Buffer");
    }
  }
  async generate({
    imageUrl,
    algoType = "anime",
    ...rest
  }) {
    if (!this.token) {
      await this.autoAuth();
    }
    const validAlgoTypes = this.algoTypeOptions.map(opt => opt.value);
    if (!validAlgoTypes.includes(algoType)) {
      throw new Error(`algoType tidak valid. Pilihan yang tersedia: ${validAlgoTypes.join(", ")}`);
    }
    try {
      const imageData = await this.processImageInput(imageUrl);
      const formData = new FormData();
      formData.append("type_name", "GenerateHumanAnimeStyle");
      formData.append("algoType", algoType);
      Object.keys(rest).forEach(key => {
        formData.append(key, rest[key]);
      });
      formData.append("imageURL", imageData.buffer, {
        filename: imageData.filename,
        contentType: imageData.contentType
      });
      const formHeaders = {
        ...this.headers,
        token: this.token,
        ...formData.getHeaders()
      };
      delete formHeaders["content-type"];
      const response = await axios.post(`${this.baseURL}/api/ai/img/facebody/main`, formData, {
        headers: formHeaders,
        timeout: 6e4
      });
      return response.data;
    } catch (error) {
      console.error("Error generating image:", error.message);
      if (error.response && error.response.status === 401) {
        console.log("Token mungkin expired, mencoba autentikasi ulang...");
        this.token = null;
        return this.generate({
          imageUrl: imageUrl,
          algoType: algoType,
          ...rest
        });
      }
      throw error;
    }
  }
  getAlgoTypeOptions() {
    return this.algoTypeOptions;
  }
  getUserInfo() {
    return this.userInfo;
  }
  getToken() {
    return this.token;
  }
  getEmail() {
    return this.email;
  }
  setToken(token) {
    this.token = token;
    this.client.defaults.headers.common["token"] = this.token;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const client = new PixelfoxClient();
  try {
    const data = await client.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}