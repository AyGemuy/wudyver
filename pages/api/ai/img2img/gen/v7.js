import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper as axiosCookiejarSupport
} from "axios-cookiejar-support";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class Imagable {
  constructor() {
    this.sessionToken = null;
    this.jar = new CookieJar();
    this.axiosClient = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/5.37.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/5.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        ...SpoofHead()
      },
      jar: this.jar
    });
    axiosCookiejarSupport(this.axiosClient);
  }
  log(message, data = null) {
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta"
    });
    if (data) {
      console.log(`[${timestamp}] ${message}`, data);
    } else {
      console.log(`[${timestamp}] ${message}`);
    }
  }
  async ensureAuth() {
    if (!this.sessionToken) {
      this.log("Sesi tidak tersedia, melakukan registrasi...");
      const authData = await this.register();
      this.sessionToken = authData.token;
    }
    return {
      token: this.sessionToken
    };
  }
  async register() {
    this.log("Memulai proses registrasi...");
    try {
      const mailApi = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
      this.log("Membuat alamat email sementara...");
      const mailResponse = await axios.get(`${mailApi}?action=create`);
      const email = mailResponse.data.email;
      if (!email) throw new Error("Gagal membuat alamat email dari wudysoft API.");
      this.log(`Email berhasil dibuat: ${email}`);
      const name = `User${Date.now()}`;
      const password = `Pass${Date.now()}!`;
      await this.axiosClient.post("https://imagable.ai/api/auth/sign-up/email", {
        name: name,
        email: email,
        password: password
      }, {
        headers: {
          Referer: "https://imagable.ai/tools/image-editor"
        }
      });
      this.log(`Pendaftaran berhasil dikirim untuk ${email}. Menunggu email verifikasi...`);
      let verificationLink = null;
      let attempts = 0;
      const maxAttempts = 60;
      while (!verificationLink && attempts < maxAttempts) {
        attempts++;
        this.log(`Mengecek email (Percobaan ${attempts}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 3e3));
        try {
          const messageResponse = await axios.get(`${mailApi}?action=message&email=${email}`);
          const messageContent = messageResponse.data?.data?.[0]?.text_content;
          if (messageContent) {
            const linkMatch = messageContent.match(/https:\/\/imagable\.ai\/api\/auth\/verify-email\?token=[^\s"<>]+/);
            if (linkMatch) {
              verificationLink = linkMatch[0];
              this.log(`Link verifikasi ditemukan.`);
              break;
            }
          }
        } catch (error) {
          this.log(`Gagal memeriksa pesan, mencoba lagi... Error: ${error.message}`);
        }
      }
      if (!verificationLink) throw new Error("Gagal mendapatkan email verifikasi setelah beberapa kali percobaan.");
      await this.axiosClient.get(verificationLink, {
        maxRedirects: 5
      });
      const cookies = await this.jar.getCookieString("https://imagable.ai");
      const sessionCookie = cookies.split(";").find(c => c.trim().startsWith("__Secure-better-auth.session_token="));
      if (!sessionCookie) throw new Error("Gagal mendapatkan cookie sesi setelah verifikasi.");
      this.log("Verifikasi email berhasil dan cookie sesi didapatkan.");
      const token = sessionCookie.split("=")[1].trim();
      this.sessionToken = token;
      return {
        token: token,
        cookie: sessionCookie
      };
    } catch (error) {
      const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.log(`Terjadi kesalahan saat registrasi: ${errorMessage}`);
      throw error;
    }
  }
  async generate({
    action,
    prompt,
    imageUrl,
    aspectRatio = "9:16",
    numImages = 1,
    quality = "HD"
  }) {
    await this.ensureAuth();
    this.log(`Memulai proses untuk aksi: ${action}`);
    if (!action) {
      throw new Error("Paramenter `action` diperlukan.");
    }
    let endpoint = "";
    let referer = "";
    let requestData;
    let requestHeaders = {
      origin: "https://imagable.ai"
    };
    let imageBuffer;
    let contentType = "image/jpeg";
    if (["img2img", "figure", "ghibli"].includes(action)) {
      if (!imageUrl) throw new Error(`Paramenter 'imageUrl' diperlukan untuk aksi '${action}'.`);
      if (Buffer.isBuffer(imageUrl)) {
        imageBuffer = imageUrl;
      } else if (typeof imageUrl === "string") {
        if (imageUrl.startsWith("http")) {
          const response = await axios.get(imageUrl, {
            responseType: "arraybuffer"
          });
          imageBuffer = Buffer.from(response.data);
          contentType = response.headers["content-type"] || contentType;
        } else if (imageUrl.includes(";base64,")) {
          const parts = imageUrl.split(";base64,");
          contentType = parts[0].split(":")[1] || contentType;
          imageBuffer = Buffer.from(parts[1], "base64");
        } else {
          throw new Error("Format string gambar tidak valid.");
        }
      } else {
        throw new Error("Format `imageUrl` tidak valid.");
      }
      if (!imageBuffer) throw new Error("Gagal memproses gambar.");
    }
    switch (action) {
      case "txt2img":
        endpoint = "https://imagable.ai/api/ai-tools/imageGenerator/process";
        referer = "https://imagable.ai/tools/image-generator";
        requestHeaders["content-type"] = "application/json";
        requestData = JSON.stringify({
          mode: "text-to-image",
          aspectRatio: aspectRatio,
          numImages: numImages.toString(),
          quality: quality,
          prompt: prompt
        });
        break;
      case "img2img":
        endpoint = "https://imagable.ai/api/ai-tools/imageGenerator/process";
        referer = "https://imagable.ai/tools/image-generator";
        const formDataImg = new FormData();
        formDataImg.append("image", imageBuffer, {
          filename: `image.jpg`,
          contentType: contentType
        });
        formDataImg.append("mode", "image-to-image");
        formDataImg.append("aspectRatio", aspectRatio);
        formDataImg.append("numImages", numImages.toString());
        formDataImg.append("quality", quality);
        formDataImg.append("prompt", prompt);
        requestData = formDataImg;
        Object.assign(requestHeaders, formDataImg.getHeaders());
        break;
      case "figure":
        endpoint = "https://imagable.ai/api/ai-tools/miniatureAI/process";
        referer = "https://imagable.ai/ai-effects/miniature-figures";
        const formDataFigure = new FormData();
        formDataFigure.append("image", imageBuffer, {
          filename: `image.jpg`,
          contentType: contentType
        });
        requestData = formDataFigure;
        Object.assign(requestHeaders, formDataFigure.getHeaders());
        break;
      case "ghibli":
        endpoint = "https://imagable.ai/api/ai-tools/ghibliStyle/process";
        referer = "https://imagable.ai/ai-effects/ghibli-style";
        const formDataGhibli = new FormData();
        formDataGhibli.append("image", imageBuffer, {
          filename: `image.jpg`,
          contentType: contentType
        });
        requestData = formDataGhibli;
        Object.assign(requestHeaders, formDataGhibli.getHeaders());
        break;
      default:
        throw new Error(`Aksi tidak valid: ${action}.`);
    }
    try {
      requestHeaders["referer"] = referer;
      const response = await this.axiosClient.post(endpoint, requestData, {
        headers: requestHeaders
      });
      this.log(`Proses '${action}' berhasil.`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.log(`Terjadi kesalahan saat proses '${action}': ${errorMessage}`);
      throw new Error(errorMessage);
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
      error: "Paramenter 'action' diperlukan. Pilihan: 'txt2img', 'img2img', 'figure', 'ghibli'."
    });
  }
  const imagable = new Imagable();
  try {
    let response;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' diperlukan untuk action 'txt2img'."
          });
        }
        response = await imagable.generate({
          action: action,
          ...params
        });
        return res.status(200).json(response);
      case "img2img":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter 'prompt' dan 'imageUrl' diperlukan untuk action 'img2img'."
          });
        }
        response = await imagable.generate({
          action: action,
          ...params
        });
        return res.status(200).json(response);
      case "figure":
      case "ghibli":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Paramenter 'imageUrl' diperlukan untuk action '${action}'.`
          });
        }
        response = await imagable.generate({
          action: action,
          ...params
        });
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Action tidak valid: '${action}'. Action yang didukung adalah 'txt2img', 'img2img', 'figure', dan 'ghibli'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}