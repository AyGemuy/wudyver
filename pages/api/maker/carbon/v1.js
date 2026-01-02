import axios from "axios";
class Carbonara {
  constructor() {
    this.api = "https://carbonara.solopov.dev/api/cook";
    this.ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  }
  out(msg) {
    console.log(`[Carbon-Log]: ${msg}`);
  }
  async generate({
    code,
    lang,
    ...rest
  }) {
    this.out("Memulai proses konversi...");
    try {
      const text = code || "";
      const language = lang ? lang : "auto";
      if (!text) throw new Error("Input 'code' tidak boleh kosong.");
      const body = {
        code: text,
        language: language,
        theme: rest?.theme || "seti",
        backgroundColor: rest?.backgroundColor || "rgba(171, 184, 195, 1)",
        dropShadow: rest?.dropShadow ?? true,
        dropShadowBlurRadius: rest?.dropShadowBlurRadius || "68px",
        dropShadowOffsetY: rest?.dropShadowOffsetY || "20px",
        exportSize: rest?.exportSize || "2x",
        fontSize: rest?.fontSize || "14px",
        fontFamily: rest?.fontFamily || "Hack",
        firstLineNumber: rest?.firstLineNumber || 1,
        lineHeight: rest?.lineHeight || "133%",
        lineNumbers: rest?.lineNumbers ?? false,
        paddingHorizontal: rest?.paddingHorizontal || "56px",
        paddingVertical: rest?.paddingVertical || "56px",
        prettify: rest?.prettify ?? false,
        windowControls: rest?.windowControls ?? true,
        widthAdjustment: rest?.widthAdjustment ?? true,
        ...rest
      };
      this.out("Mengirim request ke API...");
      const res = await axios.post(this.api, body, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, image/png",
          "User-Agent": this.ua
        },
        responseType: "arraybuffer"
      });
      this.out("Data berhasil diterima.");
      const contentType = res.headers["content-type"] || "image/png";
      return {
        success: true,
        buffer: Buffer.from(res.data),
        contentType: contentType
      };
    } catch (err) {
      this.out(`Gagal: ${err.message}`);
      return {
        error: true,
        message: err?.response?.data?.toString() || err.message
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
    const api = new Carbonara();
    const result = await api.generate(params);
    if (result.error) {
      console.error("Carbonara Error:", result.message);
      return res.status(500).json({
        error: "Gagal membuat gambar",
        details: result.message
      });
    }
    const finalContentType = result.contentType || "image/png";
    res.setHeader("Content-Type", finalContentType);
    if (result.buffer) {
      res.setHeader("Content-Length", result.buffer.length);
    }
    return res.status(200).send(result.buffer);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}