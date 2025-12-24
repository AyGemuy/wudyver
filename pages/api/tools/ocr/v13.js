import axios from "axios";
class OcrClient {
  constructor() {
    this.url = "https://staging-ai-image-ocr-266i.frontend.encr.app/api/ocr/process";
    this.client = axios.create({
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });
  }
  async prepare(image) {
    if (image instanceof Buffer) {
      return {
        imageBase64: image.toString("base64"),
        mimeType: "application/octet-stream"
      };
    }
    if (typeof image === "string") {
      if (image.startsWith("data:")) {
        const [meta, base64] = image.split(",");
        const mime = meta.match(/:(.*?);/)?.[1] || "application/octet-stream";
        return {
          imageBase64: base64,
          mimeType: mime
        };
      }
      console.log("[OCR_LOG] Download gambar dari URL...");
      const res = await axios.get(image, {
        responseType: "arraybuffer"
      });
      const mime = res.headers["content-type"]?.split(";")[0] || "application/octet-stream";
      return {
        imageBase64: Buffer.from(res.data).toString("base64"),
        mimeType: mime
      };
    }
    throw new Error("image harus Buffer atau string (URL / data-uri)");
  }
  async read({
    image
  }) {
    console.log("[OCR_LOG] Memulai OCR (JSON mode)...");
    try {
      const payload = await this.prepare(image);
      const res = await this.client.post(this.url, payload);
      console.log("[OCR_LOG] OCR sukses");
      return res.data;
    } catch (err) {
      const status = err.response?.status || "N/A";
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Unknown error";
      console.log(`[OCR_LOG] OCR gagal (${status}) → ${msg}`);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new OcrClient();
  try {
    const data = await api.read(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}