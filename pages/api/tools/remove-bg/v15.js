import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class ApiHandler {
  constructor(config) {
    const defaultConfig = {
      removebg: {
        baseUrl: "https://removebackground.dev"
      },
      upload: {
        baseUrl: `https://${apiConfig.DOMAIN_URL}/api/tools`
      }
    };
    this.config = {
      ...defaultConfig,
      ...config
    };
    console.log("[LOG] ApiProcessor diinisialisasi dengan konfigurasi.");
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
        console.log("[LOG] Input terdeteksi sebagai Buffer.");
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
    try {
      console.log("---------------------------------");
      console.log("[LOG] Proses generate dimulai.");
      const imageBuffer = await this._getBuffer(imageUrl);
      console.log("[LOG] Langkah 1: Memulai upload ke removebackground.dev...");
      const form1 = new FormData();
      const filename1 = rest?.filename || this._rndName();
      form1.append("image", imageBuffer, {
        filename: filename1
      });
      const rmvbgUrl = `${this.config.removebg.baseUrl}/upload`;
      const rmvbgResponse = await axios.post(rmvbgUrl, form1, {
        headers: {
          ...form1.getHeaders(),
          ...SpoofHead()
        },
        responseType: "arraybuffer"
      });
      const resultBuffer = rmvbgResponse?.data;
      if (!resultBuffer || resultBuffer.length === 0) {
        throw new Error("API removebackground.dev mengembalikan data kosong.");
      }
      console.log("[LOG] Langkah 1: Sukses! Background gambar berhasil dihapus.");
      console.log(`[LOG] Langkah 2: Memulai upload hasil ke ${apiConfig.DOMAIN_URL}...`);
      const form2 = new FormData();
      const baseName = filename1.split(".").slice(0, -1).join(".") || "result";
      const filename2 = `no-bg-${baseName}.png`;
      form2.append("file", resultBuffer, {
        filename: filename2
      });
      const uploadUrl = `${this.config.upload.baseUrl}/upload`;
      const uploadResponse = await axios.post(uploadUrl, form2, {
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
        console.error(`[ERROR] Data: ${error.response.data?.toString()}`);
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
    const api = new ApiHandler();
    const result = await api.generate(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}