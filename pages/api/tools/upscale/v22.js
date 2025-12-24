import axios from "axios";
import FormData from "form-data";
const createApiError = (message, status = 500) => {
  const error = new Error(message);
  error.status = status;
  error.isApiError = true;
  return error;
};
class ApiClient {
  constructor() {
    this.baseUrl = "https://ai-services.visual-paradigm.com/api/super-resolution/file";
    this.timeout = 25e3;
  }
  async _processInput(imageUrl) {
    if (Buffer.isBuffer(imageUrl)) {
      return {
        buffer: imageUrl,
        contentType: "image/png"
      };
    }
    if (typeof imageUrl !== "string") {
      throw createApiError("Input tidak valid, harus berupa String atau Buffer.", 400);
    }
    if (imageUrl.startsWith("http")) {
      try {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          timeout: this.timeout
        });
        const contentType = response.headers["content-type"];
        if (!contentType?.startsWith("image/")) {
          throw createApiError(`URL tidak menunjuk ke file gambar. Ditemukan: ${contentType || "tidak diketahui"}`, 400);
        }
        return {
          buffer: Buffer.from(response.data),
          contentType: contentType
        };
      } catch (error) {
        throw createApiError(error.isApiError ? error.message : `Gagal mengunduh gambar.`, 400);
      }
    }
    try {
      const match = imageUrl.match(/^data:(image\/.+?);base64,/);
      const base64Data = match ? imageUrl.substring(match[0].length) : imageUrl;
      const contentType = match ? match[1] : "image/png";
      return {
        buffer: Buffer.from(base64Data, "base64"),
        contentType: contentType
      };
    } catch (e) {
      throw createApiError("String Base64 tidak valid.", 400);
    }
  }
  async generate({
    imageUrl
  }) {
    try {
      const {
        buffer,
        contentType
      } = await this._processInput(imageUrl);
      const form = new FormData();
      form.append("file", buffer, {
        filename: "image.png",
        contentType: contentType
      });
      const {
        data: resultBuffer
      } = await axios.post(this.baseUrl, form, {
        headers: {
          ...form.getHeaders(),
          accept: "*/*"
        },
        responseType: "arraybuffer",
        timeout: this.timeout
      });
      if (!resultBuffer?.length) {
        throw createApiError("API eksternal mengembalikan respons kosong.", 502);
      }
      return {
        resultBuffer: resultBuffer,
        contentType: contentType
      };
    } catch (error) {
      if (error.isApiError) throw error;
      if (axios.isAxiosError(error)) {
        throw createApiError(`API eksternal gagal merespons.`, error.response?.status || 502);
      }
      throw error;
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