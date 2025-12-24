import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class AIDescribe {
  constructor() {
    this.apiUrl = "https://aidescribe.org/api/ai.describe?batch=1";
    this.defaultHeaders = {
      "content-type": "application/json",
      origin: "https://aidescribe.org",
      referer: "https://aidescribe.org/",
      "user-agent": "Postify/1.0.0",
      ...SpoofHead()
    };
  }
  async uploadImageFromUrl(imageUrl) {
    try {
      console.log(`📤 Mengunggah gambar dari URL: ${imageUrl}`);
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(response.data);
      const base64Image = `data:${response.headers["content-type"] || "image/jpeg"};base64,${imageBuffer.toString("base64")}`;
      console.log(`✅ Gambar berhasil diunggah dari URL: ${imageUrl}`);
      return base64Image;
    } catch (error) {
      console.error(`❌ Gagal mengunggah gambar dari URL: ${imageUrl}`, error);
      throw error;
    }
  }
  async describeImage({
    imageUrl,
    prompt = "Gambar apa itu?"
  }) {
    try {
      console.log(`🖼️ Memproses deskripsi gambar dari URL: ${imageUrl} dengan prompt: "${prompt}"`);
      const imageBase64 = await this.uploadImageFromUrl(imageUrl);
      const requestData = {
        0: {
          json: {
            image: imageBase64,
            prompt: prompt
          }
        }
      };
      console.log("📡 Mengirim permintaan deskripsi gambar ke server...");
      const response = await axios.post(this.apiUrl, requestData, {
        headers: this.defaultHeaders
      });
      if (!response.data?.[0]?.result?.data?.json) {
        throw new Error("Format respons tidak valid");
      }
      const result = response.data[0].result.data.json;
      console.log(`✅ Deskripsi berhasil diproses: ${result.description}`);
      return result;
    } catch (error) {
      console.error("❌ Terjadi kesalahan saat mendeskripsikan gambar:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const describer = new AIDescribe();
    const response = await describer.describeImage(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}