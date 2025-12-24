import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class EzRemove {
  constructor(config) {
    const defaultConfig = {
      ezremove: {
        baseUrl: "https://api.ezremove.ai"
      }
    };
    this.config = {
      ...defaultConfig,
      ...config
    };
    this.productSerial = this._rndSeri();
    console.log("[LOG] EzRemoveProcessor diinisialisasi.");
  }
  _rndSeri() {
    const chars = "0123456789abcdef";
    let serial = "";
    for (let i = 0; i < 32; i++) {
      serial += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    console.log(`[LOG] Product Serial Dihasilkan: ${serial}`);
    return serial;
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
        return Buffer.from(response.data);
      }
      console.log("[LOG] Mengonversi Base64 ke Buffer...");
      return Buffer.from(source, "base64");
    } catch (error) {
      console.error("[ERROR] Gagal mempersiapkan buffer gambar:", error.message);
      throw new Error(`Gagal memproses input gambar: ${error.message}`);
    }
  }
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    try {
      console.log("---------------------------------");
      console.log("[LOG] Proses EzRemove dimulai.");
      const imageBuffer = await this._getBuffer(imageUrl);
      console.log("[LOG] Mengunggah gambar untuk membuat pekerjaan...");
      const createJobForm = new FormData();
      const filename = rest?.filename || this._rndName();
      createJobForm.append("image_file", imageBuffer, {
        filename: filename
      });
      const createJobUrl = `${this.config.ezremove.baseUrl}/api/ez-remove/background-remove/create-job`;
      const createJobResponse = await axios.post(createJobUrl, createJobForm, {
        headers: {
          ...createJobForm.getHeaders(),
          accept: "*/*",
          "accept-language": "id-ID",
          origin: "https://ezremove.ai",
          priority: "u=1, i",
          "product-serial": this.productSerial,
          referer: "https://ezremove.ai/",
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
      const createJobJson = createJobResponse.data;
      if (createJobJson.code !== 1e5 || !createJobJson.result?.job_id) {
        throw new Error("Gagal membuat pekerjaan di EzRemove atau tidak mendapatkan job_id.");
      }
      const jobId = createJobJson.result.job_id;
      console.log(`[LOG] Pekerjaan berhasil dibuat dengan job_id: ${jobId}`);
      console.log("[LOG] Memulai polling untuk hasil pekerjaan...");
      const maxRetries = 60;
      const pollInterval = 3e3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`[LOG] Percobaan polling ke-${attempt}/${maxRetries}...`);
        const getJobUrl = `${this.config.ezremove.baseUrl}/api/ez-remove/background-remove/get-job/${jobId}`;
        const getJobResponse = await axios.get(getJobUrl, {
          headers: {
            accept: "*/*",
            "accept-language": "id-ID",
            "content-type": "application/json; charset=UTF-8",
            origin: "https://ezremove.ai",
            priority: "u=1, i",
            referer: "https://ezremove.ai/",
            "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
            ...SpoofHead()
          }
        });
        const getJobJson = getJobResponse.data;
        if (getJobJson.code === 1e5 && getJobJson.result?.output?.length > 0) {
          console.log("[LOG] Sukses! Hasil pekerjaan diterima.");
          console.log("[LOG] Proses selesai.");
          console.log("---------------------------------");
          return getJobJson;
        }
        await this._delay(pollInterval);
      }
      throw new Error(`Gagal mendapatkan hasil untuk job_id ${jobId} setelah ${maxRetries} percobaan.`);
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
    const api = new EzRemove();
    const result = await api.generate(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}