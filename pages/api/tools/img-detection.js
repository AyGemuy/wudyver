import axios from "axios";
import FormData from "form-data";
class SightEngineClient {
  constructor() {
    try {
      console.log("Inisialisasi client...");
      this.apiUser = "505217032";
      this.apiSecret = "YPKBoEVgfG4ueygPnXCneBX55uygVEy7";
      this.baseURL = "https://api.sightengine.com/1.0/check.json";
      this.models = ["nudity-2.1", "weapon", "alcohol", "recreational_drug", "medical", "properties", "type", "quality", "offensive-2.0", "faces", "text-content", "face-age", "gore-2.0", "text", "qr-content", "tobacco", "genai", "violence", "self-harm", "money", "gambling"];
      console.log("Client siap");
    } catch (error) {
      console.error("Error inisialisasi:", error.message);
      throw error;
    }
  }
  async generate({
    image,
    model,
    ...rest
  }) {
    try {
      console.log("Mulai analisis gambar...");
      const models = this.validateModel(model);
      console.log(`Model: ${models}`);
      const formData = new FormData();
      formData.append("models", models);
      formData.append("api_user", this.apiUser);
      formData.append("api_secret", this.apiSecret);
      await this.processImage(formData, image);
      Object.keys(rest || {}).forEach(key => {
        try {
          formData.append(key, rest[key]);
        } catch (error) {
          console.warn(`Gagal tambah parameter ${key}:`, error.message);
        }
      });
      console.log("Kirim request...");
      const response = await axios.post(this.baseURL, formData, {
        headers: formData.getHeaders(),
        timeout: 3e4
      });
      console.log("Request berhasil", response.data);
      return response.data;
    } catch (error) {
      console.error("Error generate:", error.message);
      throw new Error(`Gagal analisis: ${error.response?.data?.message || error.message}`);
    }
  }
  validateModel(model) {
    try {
      console.log("Validasi model...");
      const input = (model || "nudity-2.1").split(",").map(m => m.trim()).filter(m => m);
      const valid = input.filter(m => this.models.includes(m));
      if (valid.length === 0) {
        console.warn("Model tidak valid, gunakan default");
        return "nudity-2.1";
      }
      const invalid = input.filter(m => !this.models.includes(m));
      if (invalid.length > 0) {
        console.warn(`Model diabaikan: ${invalid.join(", ")}`);
      }
      console.log(`Model valid: ${valid.join(", ")}`);
      return valid.join(",");
    } catch (error) {
      console.error("Error validasi model:", error.message);
      return "nudity-2.1";
    }
  }
  async processImage(formData, image) {
    try {
      console.log("Proses gambar...");
      if (!image) {
        throw new Error("Image diperlukan");
      }
      if (typeof image === "string" && image.startsWith("http")) {
        console.log("Download dari URL...");
        const response = await axios.get(image, {
          responseType: "arraybuffer",
          timeout: 15e3
        });
        formData.append("media", Buffer.from(response.data), "image.jpg");
      } else if (typeof image === "string" && image.startsWith("data:")) {
        console.log("Proses base64...");
        const base64Data = image.split(",")[1] || image;
        const buffer = Buffer.from(base64Data, "base64");
        formData.append("media", buffer, "image.jpg");
      } else if (Buffer.isBuffer(image)) {
        console.log("Gunakan buffer...");
        formData.append("media", image, "image.jpg");
      } else {
        throw new Error("Format tidak didukung");
      }
      console.log("Gambar siap");
    } catch (error) {
      console.error("Error proses gambar:", error.message);
      throw new Error(`Gagal proses gambar: ${error.message}`);
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
  const api = new SightEngineClient();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}