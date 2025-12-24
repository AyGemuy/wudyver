import axios from "axios";
import PROMPT from "@/configs/ai-prompt";
class AIGenerator {
  constructor() {
    this.config = {
      baseURL: "https://veo3-backend-alpha.vercel.app/api",
      endpoints: {
        login: "/v1/user/login",
        chat: "/v1/chat",
        uploadImages: "/v1/chat/upload-images",
        chatPoll: "/v1/chat/poll/status/"
      },
      defaultLoginPayload: {
        build: "1.2.1",
        country: "US",
        language: "en",
        platform: "Android",
        version: "1.2.1",
        osVersion: "33",
        timeZone: "America/Los_Angeles"
      }
    };
    this.token = null;
  }
  _generateRandomString(length) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  _createLoginData() {
    const randomId = this._generateRandomString(21);
    return {
      ...this.config.defaultLoginPayload,
      googleAccountId: `10${randomId}`,
      email: `user.${this._generateRandomString(5)}@example.com`,
      displayName: `User ${this._generateRandomString(5)}`,
      deviceId: `device_${this._generateRandomString(16)}`,
      deviceModel: `SDK_${this._generateRandomString(4)}`
    };
  }
  _buildHeaders() {
    if (!this.token) {
      throw new Error("Token tidak tersedia. Silakan login terlebih dahulu.");
    }
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`
    };
  }
  async _login() {
    console.log("PROSES: Mencoba untuk login...");
    try {
      const response = await axios.post(`${this.config.baseURL}${this.config.endpoints.login}`, this._createLoginData());
      if (response.data && response.data.token) {
        this.token = response.data.token;
        console.log("SUKSES: Login berhasil dan token diterima.");
      } else {
        throw new Error("Respons login tidak valid atau tidak mengandung token.");
      }
    } catch (error) {
      console.error("GAGAL: Terjadi kesalahan saat login.", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async _ensureLogin() {
    if (!this.token) {
      console.log("LOG: Token tidak ditemukan, menjalankan proses login...");
      await this._login();
    }
  }
  async _uploadFile(file) {
    console.log(`PROSES: Memulai proses unggah untuk ${file.fileName}...`);
    try {
      console.log(` -> Meminta izin unggah...`);
      const presignResponse = await axios.post(`${this.config.baseURL}${this.config.endpoints.uploadImages}`, {
        images: [{
          fileName: file.fileName,
          fileType: file.fileType
        }]
      }, {
        headers: this._buildHeaders()
      });
      const uploadInfo = presignResponse.data.data[0];
      if (!uploadInfo || !uploadInfo.uploadUrl) {
        throw new Error("Gagal mendapatkan URL pre-signed dari server.");
      }
      console.log(` -> SUKSES: URL pre-signed diterima.`);
      console.log(` -> Mengunggah data file...`);
      await axios.put(uploadInfo.uploadUrl, file.data, {
        headers: {
          "Content-Type": file.fileType
        }
      });
      console.log(`SUKSES: Unggah untuk ${file.fileName} berhasil.`);
      return uploadInfo.fileUrl;
    } catch (error) {
      console.error(`GAGAL: Terjadi kesalahan saat mengunggah ${file.fileName}.`, error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async _pollStatus(requestId) {
    console.log(`PROSES: Memulai polling untuk requestId: ${requestId}...`);
    const pollUrl = `${this.config.baseURL}${this.config.endpoints.chatPoll}${requestId}`;
    while (true) {
      try {
        const {
          data
        } = await axios.get(pollUrl, {
          headers: this._buildHeaders()
        });
        if (data.isCompleted) {
          console.log("SUKSES: Tugas telah selesai.");
          return data;
        }
        console.log("LOG: Status tugas belum selesai. Menunggu 3 detik sebelum mencoba lagi...");
      } catch (error) {
        console.error("GAGAL: Terjadi kesalahan saat polling status.", error.response ? error.response.data : error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 3e3));
    }
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    ...rest
  }) {
    console.log("PROSES: Memulai alur kerja generate...");
    try {
      if (!prompt) {
        throw new Error("Paramenter `prompt` wajib diisi.");
      }
      await this._ensureLogin();
      const imageArray = imageUrl ? Array.isArray(imageUrl) ? imageUrl : [imageUrl] : [];
      const finalImageUrls = [];
      if (imageArray.length > 0) {
        console.log(`LOG: Memproses ${imageArray.length} gambar...`);
        for (const image of imageArray) {
          let processedUrl;
          if (typeof image === "string" && image.startsWith("http")) {
            console.log(" -> Mendeteksi URL, menambahkannya secara langsung.");
            processedUrl = image;
          } else if (typeof image === "string" && image.startsWith("data:")) {
            console.log(" -> Mendeteksi data Base64, memproses untuk diunggah...");
            const match = image.match(/^data:(.+);base64,(.*)$/);
            if (!match) throw new Error("Format string Base64 tidak valid.");
            const [, fileType, data] = match;
            const extension = fileType.split("/")[1] || "bin";
            processedUrl = await this._uploadFile({
              fileName: `upload.${extension}`,
              fileType: fileType,
              data: Buffer.from(data, "base64")
            });
          } else if (typeof image === "object" && image.data instanceof Buffer) {
            console.log(` -> Mendeteksi Buffer untuk file "${image.fileName}", memproses untuk diunggah...`);
            if (!image.fileType || !image.fileName) {
              throw new Error("Objek gambar Buffer harus memiliki properti `fileType` dan `fileName`.");
            }
            processedUrl = await this._uploadFile(image);
          } else {
            throw new Error(`Format gambar tidak didukung untuk item: ${JSON.stringify(image)}`);
          }
          finalImageUrls.push(processedUrl);
        }
      }
      const chatData = {
        prompt: prompt,
        imageUrls: finalImageUrls,
        ...rest
      };
      console.log("PROSES: Mengirim permintaan tugas final dengan data:", chatData);
      const initialResponse = await axios.post(`${this.config.baseURL}${this.config.endpoints.chat}`, chatData, {
        headers: this._buildHeaders()
      });
      if (initialResponse.data && initialResponse.data.requestId) {
        console.log(`SUKSES: Permintaan tugas diterima dengan requestId: ${initialResponse.data.requestId}.`);
        return await this._pollStatus(initialResponse.data.requestId);
      } else {
        throw new Error("Respons dari server tidak mengandung requestId.");
      }
    } catch (error) {
      console.error("GAGAL: Terjadi kesalahan besar pada proses generate.", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const api = new AIGenerator();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}