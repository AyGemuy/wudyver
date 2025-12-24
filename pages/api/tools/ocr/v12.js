import axios from "axios";
import FormData from "form-data";
class OcrClient {
  constructor(baseURL = "https://www.picturetotext.org/api") {
    this.apiKey = "a587ae06ffebbcea1e500149eb620241";
    this.client = axios.create({
      baseURL: baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json"
      }
    });
  }
  async fetchImg(input) {
    if (input.startsWith("data:")) {
      const [metadata, base64Data] = input.split(",");
      const mimeType = metadata.match(/data:(.*?);/)?.[1] || "application/octet-stream";
      const ext = mimeType.split("/")[1] || "bin";
      return {
        buffer: Buffer.from(base64Data, "base64"),
        mimeType: mimeType,
        filename: `image.${ext}`
      };
    }
    try {
      const res = await axios.get(input, {
        responseType: "arraybuffer"
      });
      const mimeType = res.headers["content-type"]?.split(";")[0] || "application/octet-stream";
      const ext = mimeType.split("/")[1] || "bin";
      return {
        buffer: Buffer.from(res.data),
        mimeType: mimeType,
        filename: `image.${ext}`
      };
    } catch (err) {
      console.log(`[OCR_LOG] Gagal download URL: ${err.message}`);
      throw err;
    }
  }
  async toFormData(image) {
    const form = new FormData();
    let buffer, mimeType, filename;
    if (typeof image === "string") {
      const data = await this.fetchImg(image);
      buffer = data.buffer;
      mimeType = data.mimeType;
      filename = data.filename;
    } else if (image instanceof Buffer) {
      buffer = image;
      mimeType = "application/octet-stream";
      filename = "image.bin";
    } else {
      throw new Error("image harus string (URL/Base64) atau Buffer");
    }
    form.append("file", buffer, {
      filename: filename,
      contentType: mimeType
    });
    return form;
  }
  async read({
    image
  }) {
    console.log("[OCR_LOG] Memulai OCR...");
    try {
      const form = await this.toFormData(image);
      const response = await this.client.post("/process-image", form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity
      });
      console.log("[OCR_LOG] OCR sukses");
      return response.data;
    } catch (err) {
      const status = err.response?.status || err.code || "N/A";
      const msg = err.response?.data?.message || err.response?.data?.mess || err.message || "Unknown error";
      console.log(`[OCR_LOG] OCR gagal (Status: ${status}) - ${msg}`);
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