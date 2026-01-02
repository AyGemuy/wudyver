import axios from "axios";
class CarbonVercel {
  constructor() {
    this.url = "https://carbon-api.vercel.app/api";
    this.ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  }
  log(t) {
    console.log(`[Carbon-Vercel]: ${t}`);
  }
  async generate({
    code,
    theme,
    ...rest
  }) {
    this.log("Menyiapkan request...");
    try {
      const inputCode = code || "";
      const inputTheme = theme ? theme : "seti";
      if (!inputCode) throw new Error("Parameter 'code' wajib diisi.");
      const payload = {
        code: inputCode,
        theme: inputTheme,
        ...rest
      };
      this.log(`Mengirim kode dengan tema: ${inputTheme}`);
      const response = await axios.post(this.url, payload, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.ua
        },
        responseType: "arraybuffer"
      });
      this.log("Gambar berhasil di-generate.");
      const contentType = response.headers["content-type"] || "image/png";
      return {
        success: true,
        buffer: Buffer.from(response.data),
        contentType: contentType
      };
    } catch (err) {
      this.log(`Error terjadi: ${err.message}`);
      return {
        error: true,
        message: err?.response?.data?.toString() || err.message,
        status: err?.response?.status || 500
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: "Parameter 'code' diperlukan"
    });
  }
  try {
    const api = new CarbonVercel();
    const result = await api.generate(params);
    if (result.error) {
      console.error("CarbonVercel API Error:", result.message);
      return res.status(result.status || 500).json({
        error: "Gagal memproses gambar",
        details: result.message
      });
    }
    const finalContentType = result.contentType || "image/png";
    res.setHeader("Content-Type", finalContentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}