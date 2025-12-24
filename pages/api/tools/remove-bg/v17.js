import axios from "axios";
import FormData from "form-data";
import https from "https";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class FileConv {
  constructor(config) {
    const defaultConfig = {
      fileconv: {
        baseUrl: "https://fileconv.online/api"
      },
      upload: {
        baseUrl: `https://${apiConfig.DOMAIN_URL}/api/tools`
      }
    };
    this.config = {
      ...defaultConfig,
      ...config
    };
    console.log("[LOG] FileConvProcessor diinisialisasi.");
  }
  _rndName(originalName = "image.jpg") {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split(".").pop() || "jpg";
    const newName = `${timestamp}-${randomStr}.${extension}`;
    console.log(`[LOG] Nama file acak dihasilkan: ${newName}`);
    return newName;
  }
  async _getBuffer(source) {
    try {
      console.log("[LOG] Mempersiapkan buffer gambar...");
      if (Buffer.isBuffer(source)) {
        return source;
      }
      if (source.startsWith("http")) {
        console.log(`[LOG] Mengunduh gambar dari URL...`);
        const response = await axios.get(source, {
          responseType: "arraybuffer"
        });
        return response.data;
      }
      console.log("[LOG] Mengonversi Base64 ke Buffer...");
      return Buffer.from(source, "base64");
    } catch (error) {
      console.error("[ERROR] Gagal mempersiapkan buffer gambar:", error.message);
      throw new Error(`Gagal memproses input gambar: ${error.message}`);
    }
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    const agent = new https.Agent({
      keepAlive: true
    });
    try {
      console.log("---------------------------------");
      console.log("[LOG] Proses FileConv generate dimulai.");
      const imageBuffer = await this._getBuffer(imageUrl);
      console.log("[LOG] Langkah 1: Memulai upload ke fileconv.online...");
      const form1 = new FormData();
      const filename1 = rest?.filename || this._rndName();
      form1.append("file", imageBuffer, {
        filename: filename1
      });
      const fileconvUrl = `${this.config.fileconv.baseUrl}/remove-bg`;
      const fileconvResponse = await axios.post(fileconvUrl, form1, {
        httpsAgent: agent,
        headers: {
          ...form1.getHeaders(),
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID",
          origin: "https://fileconv.online",
          referer: "https://fileconv.online/id/remove-bg",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          ...SpoofHead()
        }
      });
      const imageBase64 = fileconvResponse?.data?.image;
      if (!imageBase64) {
        throw new Error("API fileconv tidak mengembalikan data gambar base64.");
      }
      console.log("[LOG] Langkah 1: Sukses! Gambar base64 diterima dari FileConv.");
      console.log(`[LOG] Langkah 2: Memulai upload hasil ke ${apiConfig.DOMAIN_URL}...`);
      const resultBuffer = Buffer.from(imageBase64, "base64");
      const form2 = new FormData();
      const baseName = filename1.split(".").slice(0, -1).join(".") || "result";
      const filename2 = `no-bg-${baseName}.png`;
      form2.append("file", resultBuffer, {
        filename: filename2
      });
      const uploadUrl = `${this.config.upload.baseUrl}/upload`;
      const uploadResponse = await axios.post(uploadUrl, form2, {
        httpsAgent: agent,
        headers: {
          ...form2.getHeaders()
        }
      });
      console.log("[LOG] Langkah 2: Sukses! Hasil berhasil diunggah.");
      console.log("[LOG] Proses generate selesai dengan sukses.");
      console.log("---------------------------------");
      return uploadResponse?.data || {
        message: "Proses berhasil tanpa data respons."
      };
    } catch (error) {
      console.error("\n[FATAL ERROR] Terjadi kesalahan fatal selama proses generate.");
      console.error(`[ERROR] Pesan: ${error.message}`);
      if (error.response) {
        console.error(`[ERROR] Status: ${error.response.status}`);
        console.error(`[ERROR] Data: ${JSON.stringify(error.response.data)}`);
      }
      console.log("---------------------------------\n");
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' is required"
    });
  }
  try {
    const api = new FileConv();
    const result = await api.generate(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}