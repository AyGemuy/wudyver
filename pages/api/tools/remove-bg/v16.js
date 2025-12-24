import axios from "axios";
import FormData from "form-data";
import https from "https";
import SpoofHead from "@/lib/spoof-head";
class EraseBg {
  constructor(config) {
    const defaultConfig = {
      erasebg: {
        baseUrl: "https://apix.erasebg.org"
      }
    };
    this.config = {
      ...defaultConfig,
      ...config
    };
    console.log("[LOG] EraseBgProcessor diinisialisasi.");
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
      console.log("[LOG] Proses EraseBG dimulai.");
      const imageBuffer = await this._getBuffer(imageUrl);
      console.log("[LOG] Mengunggah gambar ke apix.erasebg.org...");
      const form = new FormData();
      const filename = rest?.filename || this._rndName();
      form.append("input", imageBuffer, {
        filename: filename
      });
      const erasebgUrl = `${this.config.erasebg.baseUrl}/bp/u/`;
      const agent = new https.Agent({
        keepAlive: true
      });
      const response = await axios.post(erasebgUrl, form, {
        httpsAgent: agent,
        headers: {
          ...form.getHeaders(),
          accept: "*/*",
          "accept-language": "id-ID",
          origin: "https://erasebg.org",
          priority: "u=1, i",
          referer: "https://erasebg.org/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          ...SpoofHead()
        }
      });
      const jsonResponse = response?.data;
      if (!jsonResponse) {
        throw new Error("API erasebg tidak mengembalikan respons JSON yang valid.");
      }
      console.log("[LOG] Sukses! Respons JSON diterima dari EraseBG.");
      console.log("[LOG] Proses selesai.");
      console.log("---------------------------------");
      return jsonResponse;
    } catch (error) {
      console.error("\n[FATAL ERROR] Terjadi kesalahan fatal selama proses.");
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
    const api = new EraseBg();
    const result = await api.generate(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}