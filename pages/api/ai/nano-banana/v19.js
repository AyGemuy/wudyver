import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
import apiConfig from "@/configs/apiConfig";
class Nanophoto {
  constructor() {
    this.config = {
      nanophoto: {
        baseURL: "https://nanophoto.ai/api",
        endpoints: {
          imageEdit: "/image-edit"
        }
      },
      wudysoft: {
        baseURL: `https://${apiConfig.DOMAIN_URL}/api/tools`,
        endpoints: {
          upload: "/upload",
          cfToken: "/cf-token"
        }
      }
    };
    this.api = axios.create({
      baseURL: this.config.nanophoto.baseURL,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
        Referer: "https://nanophoto.ai/?utm_source=iuu",
        ...SpoofHead()
      }
    });
    this.wudysoft = axios.create({
      baseURL: this.config.wudysoft.baseURL,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async gToken() {
    console.log("Proses: Mendapatkan token...");
    try {
      const response = await this.wudysoft.get(this.config.wudysoft.endpoints.cfToken, {
        params: {
          sitekey: "0x4AAAAAABuTmJKbAZUuzPNT",
          url: "https://nanophoto.ai/"
        }
      });
      const token = response.data?.token;
      if (token) {
        console.log("Proses: Token berhasil didapatkan.");
        return token;
      }
      throw new Error("Gagal mendapatkan token dari API.");
    } catch (error) {
      console.error("Error saat mengambil token:", error.message);
      throw error;
    }
  }
  async uploadToWudysoft(base64Buffer) {
    console.log("Proses: Mengupload gambar ke Wudysoft...");
    try {
      const formData = new FormData();
      const imageBuffer = Buffer.from(base64Buffer.toString("base64"), "base64");
      formData.append("file", imageBuffer, {
        filename: "image.png",
        contentType: "image/png"
      });
      const response = await this.wudysoft.post(this.config.wudysoft.endpoints.upload, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      console.log("Proses: Upload berhasil");
      return response.data;
    } catch (error) {
      console.error("Error saat upload ke Wudysoft:", error.message);
      throw error;
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    console.log("Proses: Memulai generate gambar...");
    try {
      const captchaToken = await this.gToken();
      const mode = imageUrl ? "edit" : "generate";
      console.log(`Proses: Mode terpilih -> ${mode}`);
      const payload = {
        prompt: prompt || "A beautiful landscape",
        mode: mode,
        captchaToken: captchaToken,
        ...rest
      };
      if (imageUrl) {
        let imageData = imageUrl;
        if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
          console.log("Proses: Mengunduh gambar dari URL...");
          const imageResponse = await axios.get(imageUrl, {
            responseType: "arraybuffer"
          });
          imageData = Buffer.from(imageResponse.data);
        } else if (Buffer.isBuffer(imageUrl)) {
          imageData = imageUrl;
        }
        payload.imageData = imageData.toString("base64");
        payload.mimeType = rest.mimeType || "image/png";
      }
      console.log("Proses: Mengirim permintaan ke API Nanophoto...");
      const {
        data
      } = await this.api.post(this.config.nanophoto.endpoints.imageEdit, payload);
      console.log("Proses: Berhasil mendapatkan respon dari API.");
      const uploadResults = {
        upload: []
      };
      if (data && data.images) {
        console.log("Proses: Auto upload images ke Wudysoft...");
        for (const image of data.images) {
          if (image.data) {
            try {
              const imageBuffer = Buffer.from(image.data, "base64");
              const uploadResult = await this.uploadToWudysoft(imageBuffer);
              uploadResults.upload.push(uploadResult);
            } catch (uploadError) {
              console.error("Gagal upload image:", uploadError.message);
              uploadResults.upload.push({
                error: uploadError.message
              });
            }
          }
        }
      }
      return uploadResults;
    } catch (error) {
      console.error("Error saat generate gambar:", error.response?.data || error.message);
      throw error;
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
  const api = new Nanophoto();
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