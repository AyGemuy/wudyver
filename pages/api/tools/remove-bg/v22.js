import axios from "axios";
import FormData from "form-data";
class ApiClient {
  constructor(baseUrl = "https://loadbalancer.dalliegenerator.app") {
    this.BASE_URL = baseUrl;
  }
  _toBuffer(input) {
    if (Buffer.isBuffer(input)) return input;
    if (typeof input === "string") {
      const match = input.match(/^data:image\/(.+?);base64,(.*)$/);
      const base64String = match ? match[2] : input;
      if (base64String.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(base64String)) {
        try {
          return Buffer.from(base64String, "base64");
        } catch (e) {
          console.warn("[Helper] Konversi string ke buffer gagal (Base64 tidak valid).");
          return null;
        }
      }
    }
    return null;
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    if (!imageUrl) throw new Error("imageUrl harus disediakan.");
    const path = "/images/remove-bg";
    const url = `${this.BASE_URL}${path}`;
    try {
      console.log(`[API] Mulai proses hapus latar belakang ke ${path}...`);
      const form = new FormData();
      let fileBuffer = this._toBuffer(imageUrl);
      let filename = `image_${Date.now()}.jpg`;
      let mimeType = "image/jpeg";
      let uploadSource = "Base64/Buffer";
      if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
        uploadSource = "URL Dikonversi";
        console.log(`[API] Mengambil gambar dari URL: ${imageUrl.substring(0, 50)}...`);
        const imgResponse = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        fileBuffer = Buffer.from(imgResponse.data);
        filename = imageUrl.split("/").pop()?.split("?")[0] || filename;
        mimeType = imgResponse.headers["content-type"] || mimeType;
      } else if (!fileBuffer) {
        throw new Error("Format imageUrl tidak valid (bukan URL, Base64, atau Buffer).");
      }
      console.log(`[API] Mengunggah gambar (${uploadSource}) ke ${path}...`);
      form.append("file", fileBuffer, {
        filename: filename,
        contentType: mimeType
      });
      Object.keys(rest).forEach(key => {
        form.append(key, rest[key]);
      });
      const response = await axios.post(url, form, {
        headers: form.getHeaders()
      });
      const responseData = response.data || {};
      const base64Image = responseData.image_base64 || responseData.image_base64_encoded;
      if (!base64Image || typeof base64Image !== "string") {
        console.error("[API ERROR] Respons API tidak mengandung data gambar Base64 yang diharapkan.");
        throw new Error("Remove BG failed: Data Base64 tidak ditemukan dalam respons.");
      }
      const imageBuffer = Buffer.from(base64Image, "base64");
      console.log(`[API] Berhasil! Mengkonversi Base64 (${base64Image.length} chars) ke Buffer.`);
      return {
        resultBuffer: imageBuffer,
        length: imageBuffer.length,
        contentType: "image/png"
      };
    } catch (error) {
      const status = error.response?.status || "N/A";
      const msg = error.response?.data?.message || error.message || "Unknown Error";
      console.error(`[API ERROR] ${path} gagal (Status: ${status}): ${msg}`);
      throw new Error(`Remove BG failed (${status})`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "POST" ? req.body : req.query;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' wajib diisi."
    });
  }
  try {
    const apiClient = new ApiClient();
    const resultGen = await apiClient.generate(params);
    res.setHeader("Content-Type", resultGen.contentType);
    return res.status(200).send(resultGen.resultBuffer);
  } catch (error) {
    console.error("API Handler Error:", error.message);
    if (error.isApiError) {
      return res.status(error.status).json({
        error: error.message
      });
    }
    return res.status(500).json({
      error: "Terjadi kesalahan internal pada server."
    });
  }
}