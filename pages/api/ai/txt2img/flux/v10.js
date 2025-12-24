import axios from "axios";
class Flux {
  constructor() {
    this.api = "https://fluxai.pro/api/tools/fast";
  }
  async exec(payload) {
    console.log("[Log] Mengirim permintaan ke API...");
    return await axios.post(this.api, payload, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0"
      }
    });
  }
  async generate({
    prompt,
    ...rest
  }) {
    const text = prompt || "a cute cat";
    const body = {
      prompt: text,
      ...rest
    };
    console.log(`[Log] Memproses prompt: "${text}"`);
    try {
      const res = await this.exec(body);
      const isOk = res.data?.ok ? true : false;
      if (!isOk) throw new Error("Respon API menyatakan gagal");
      console.log("[Log] Data berhasil diterima.");
      return {
        status: true,
        result: res.data?.data?.imageUrl || "URL tidak ditemukan"
      };
    } catch (err) {
      console.log("[Log] Terjadi kesalahan dalam proses.");
      return {
        status: false,
        error: err.response?.data || err.message || "Unknown Error"
      };
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
  const api = new Flux();
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