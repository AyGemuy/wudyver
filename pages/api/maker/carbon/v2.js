import axios from "axios";
class CarbonVercel {
  constructor() {
    this.url = "https://carbon-api.vercel.app/api";
    this.ua = "Mozilla/5.0 (Node.js)";
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
      const inputTheme = theme ? theme : "Seti";
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
      return {
        buffer: Buffer.from(response?.data),
        contentType: response?.headers?.["content-type"] || "image/png"
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
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}