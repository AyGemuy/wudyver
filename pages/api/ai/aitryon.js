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
class AitryonGenerator {
  constructor(userName, password) {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9",
        "Sec-CH-UA": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "Sec-CH-UA-Mobile": "?1",
        "Sec-CH-UA-Platform": '"Android"',
        ...SpoofHead()
      }
    }));
    this.userName = userName || `user_${this._randomString(8)}`;
    this.password = password || this._randomString(10);
    this.email = null;
    this.token = null;
    console.log(`Generator diinisialisasi untuk pengguna: ${this.userName}`);
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
  _randomString(length) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  async _createMail() {
    console.log("Membuat alamat email sementara...");
    try {
      const response = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      this.email = response.data?.email;
      if (!this.email) throw new Error("Respons API email tidak valid.");
      console.log(`Email berhasil dibuat: ${this.email}`);
    } catch (error) {
      console.error("Gagal membuat email:", error.message);
      throw new Error("Gagal dalam pembuatan email.");
    }
  }
  async _getOtp() {
    console.log(`Mencari OTP untuk ${this.email}...`);
    const startTime = Date.now();
    const timeout = 6e4;
    for (let i = 0; i < 20; i++) {
      try {
        if (Date.now() - startTime > timeout) {
          throw new Error("Timeout: Gagal mendapatkan OTP dalam 1 menit");
        }
        const response = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${this.email}`);
        if (response?.data?.data?.length > 0) {
          const content = response.data.data[0]?.text_content;
          const match = content?.match(/Security code: (\d{6})/);
          if (match?.[1]) {
            console.log(`OTP ditemukan: ${match[1]}`);
            return match[1];
          }
        }
      } catch (error) {
        if (error.message.includes("Timeout")) {
          throw error;
        }
      }
      await sleep(3e3);
      if (Date.now() - startTime > timeout) {
        throw new Error("Timeout: Gagal mendapatkan OTP dalam 1 menit");
      }
    }
    throw new Error("Gagal mendapatkan OTP setelah beberapa kali percobaan.");
  }
  async _authenticate() {
    try {
      await this._createMail();
      const registerPayload = JSON.stringify([{
        email: this.email,
        userName: this.userName,
        password: this.password
      }]);
      const commonHeaders = {
        Accept: "text/x-component",
        "Content-Type": "text/plain;charset=UTF-8",
        Origin: "https://aitryon.art",
        Referer: "https://aitryon.art/id/model/veo3-ai/"
      };
      console.log("Mendaftarkan akun...");
      await this.client.post("https://aitryon.art/id/model/veo3-ai/", registerPayload, {
        headers: {
          ...commonHeaders,
          "Next-Action": "4070860a61dfb3fe53e21a23f3b51a990f8c95a2a3"
        }
      });
      console.log("Meminta OTP...");
      await this.client.post("https://aitryon.art/id/model/veo3-ai/", registerPayload, {
        headers: {
          ...commonHeaders,
          "Next-Action": "4070860a61dfb3fe53e21a23f3b51a990f8c95a2a3"
        }
      });
      const otp = await this._getOtp();
      console.log("Memverifikasi akun dengan OTP...");
      const verifyPayload = JSON.stringify([{
        email: this.email,
        emailCode: otp
      }]);
      await this.client.post("https://aitryon.art/id/model/veo3-ai/", verifyPayload, {
        headers: {
          ...commonHeaders,
          "Next-Action": "405a35009dc7426189b39b372a927bae38dfaa7dce"
        }
      });
      console.log("Melakukan login untuk mendapatkan token...");
      const loginPayload = JSON.stringify([{
        email: this.email,
        password: this.password
      }]);
      const loginResponse = await this.client.post("https://aitryon.art/id/model/veo3-ai/", loginPayload, {
        headers: {
          ...commonHeaders,
          "Next-Action": "40d8eefcbee6d6197f62b31439249a650d72682f3d"
        }
      });
      const tokenMatch = loginResponse.data?.match(/"access_token":"([^"]+)"/);
      if (!tokenMatch?.[1]) throw new Error("Gagal mengekstrak token akses dari respons login.");
      this.token = tokenMatch[1];
      console.log("Berhasil diautentikasi dan token diperoleh.");
    } catch (error) {
      console.error("Gagal saat proses otentikasi:", error.message);
      throw new Error(`Otentikasi gagal: ${error.message}`);
    }
  }
  async _getPresignedUrls(mimeTypes) {
    console.log("Mendapatkan URL presigned...");
    if (!this.token) throw new Error("Token tidak ada. Otentikasi diperlukan.");
    try {
      const response = await this.client.post("https://api2.tap4.ai/image/presignedUrl", {
        site: "aitryon.art",
        mineType: mimeTypes
      }, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json"
        }
      });
      if (response.data?.rows?.length < mimeTypes.length) {
        throw new Error("Respons URL presigned tidak mencukupi.");
      }
      return response.data;
    } catch (error) {
      console.error("Gagal mendapatkan URL presigned:", error.message);
      throw new Error("Gagal meminta URL presigned.");
    }
  }
  async _uploadImage(presignedUrl, imageBuffer, imageMimeType) {
    console.log(`Mengunggah gambar (${imageMimeType})...`);
    try {
      await axios.put(presignedUrl, imageBuffer, {
        headers: {
          "Content-Type": imageMimeType
        }
      });
      console.log("Unggahan gambar berhasil.");
    } catch (error) {
      console.error("Gagal saat mengunggah gambar:", error.message);
      throw new Error(`Gagal mengunggah ke ${presignedUrl.substring(0, 50)}...`);
    }
  }
  async _processImageInput(input) {
    try {
      if (typeof input === "string" && input.startsWith("http")) {
        const response = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return {
          buffer: Buffer.from(response.data),
          mimeType: response.headers?.["content-type"] || "application/octet-stream"
        };
      }
      if (typeof input === "string" && input.startsWith("data:")) {
        const match = input.match(/^data:(.+);base64,(.+)$/);
        if (!match) throw new Error("Format Base64 Data URL tidak valid.");
        return {
          buffer: Buffer.from(match[2], "base64"),
          mimeType: match[1]
        };
      }
      if (input?.buffer instanceof Buffer && typeof input?.mimeType === "string") {
        return input;
      }
      throw new Error("Format input tidak didukung.");
    } catch (error) {
      console.error("Gagal memproses input gambar:", error.message);
      throw new Error(`Input gambar tidak valid: ${error.message}`);
    }
  }
  async generate({
    prompt,
    image,
    imageEnd,
    ...rest
  }) {
    if (!this.token) {
      await this._authenticate();
    }
    const [processedImage, processedImageEnd] = await Promise.all([this._processImageInput(image), this._processImageInput(imageEnd)]);
    const presignedData = await this._getPresignedUrls([processedImage.mimeType, processedImageEnd.mimeType]);
    const [uploadInfo1, uploadInfo2] = presignedData.rows;
    await Promise.all([this._uploadImage(uploadInfo1.signedUrl, processedImage.buffer, processedImage.mimeType), this._uploadImage(uploadInfo2.signedUrl, processedImageEnd.buffer, processedImageEnd.mimeType)]);
    console.log("Mengirim permintaan untuk membuat video...");
    try {
      const payload = {
        site: "aitryon.art",
        prompt: prompt,
        videoType: "Photo-to-video",
        model: "kling-v1-5s",
        platformType: 28,
        ratio: "9:16",
        imageUrl: uploadInfo1?.url,
        imageEndUrl: uploadInfo2?.url,
        ...rest
      };
      const response = await this.client.post("https://api2.tap4.ai/video/genVideoAsync", payload, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json"
        }
      });
      console.log("Permintaan pembuatan video berhasil dikirim.");
      if (response?.data?.data?.traceId) {
        const encryptedData = {
          token: this.token
        };
        console.log(`[LOG] Txt2vid: Tugas video berhasil dibuat. ID terenkripsi: ${await this.enc(encryptedData)}`);
        return await this.enc(encryptedData);
      }
    } catch (error) {
      console.error("Gagal membuat video:", error?.message);
      throw new Error("Gagal pada langkah akhir pembuatan video.");
    }
  }
  async status({
    task_id,
    pageNum = 1,
    pageSize = 42
  }) {
    console.log(`Mengecek status riwayat video...`);
    console.log(`[LOG] Status: Memeriksa status untuk ID tugas terenkripsi: ${task_id}.`);
    const decryptedData = await this.dec(task_id);
    const {
      token
    } = decryptedData;
    const authToken = token || this.token;
    if (!authToken) {
      throw new Error("Token tidak disediakan dan tidak ada sesi login aktif untuk mengecek status.");
    }
    try {
      const response = await this.client.get("https://api2.tap4.ai/video/history", {
        params: {
          pageNum: pageNum,
          pageSize: pageSize,
          site: "aitryon.art"
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
          Origin: "https://aitryon.art",
          Referer: "https://aitryon.art/"
        }
      });
      console.log("Berhasil mendapatkan riwayat video.");
      return response.data;
    } catch (error) {
      console.error("Gagal mendapatkan riwayat video:", error.message);
      if (error.response?.data) {
        console.error("Data Respons Error:", JSON.stringify(error.response.data));
      }
      throw new Error("Gagal mengambil status riwayat video.");
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
  const generator = new AitryonGenerator();
  try {
    let response;
    switch (action) {
      case "img2vid":
        if (!params.prompt || !params.image || !params.imageEnd) {
          return res.status(400).json({
            error: "Prompt, image and imageEnd are required for img2vid."
          });
        }
        const img2vid_task_id = await generator.generate(params);
        return res.status(200).json({
          task_id: img2vid_task_id
        });
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await generator.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'img2vid', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}