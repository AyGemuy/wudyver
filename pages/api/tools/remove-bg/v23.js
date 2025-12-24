import axios from "axios";
import FormData from "form-data";
class BackgroundRemover {
  constructor() {
    this.baseUrl = "https://srvrembg.pi7.org";
    this.apiUrl = `${this.baseUrl}/remove_bg_u2net`;
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    console.log("Mulai proses remove background...");
    try {
      let imageBuffer;
      if (imageUrl?.startsWith("data:")) {
        console.log("Processing base64 image...");
        const base64Data = imageUrl.split(",")[1] || imageUrl;
        imageBuffer = Buffer.from(base64Data, "base64");
      } else if (Buffer.isBuffer(imageUrl)) {
        console.log("Processing buffer image...");
        imageBuffer = imageUrl;
      } else {
        console.log("Downloading image from URL:", imageUrl);
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          timeout: 3e4
        });
        imageBuffer = Buffer.from(response?.data || "");
      }
      console.log("Image processed, size:", imageBuffer?.length || 0);
      if (!imageBuffer?.length) {
        throw new Error("Invalid image data");
      }
      const formData = new FormData();
      const pid = `id_${Date.now()}${Math.random().toString(36).substr(2, 10)}`;
      formData.append("pid", pid);
      formData.append("myFile[]", imageBuffer, {
        filename: `image_${Date.now()}.jpg`,
        contentType: "image/jpeg"
      });
      console.log("Mengirim request ke API...");
      const response = await axios.post(this.apiUrl, formData, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID",
          Connection: "keep-alive",
          Origin: "https://image.pi7.org",
          Referer: "https://image.pi7.org/",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          ...formData.getHeaders()
        },
        timeout: 6e4
      });
      console.log("Response API:", response?.data);
      const resultUrl = `${this.baseUrl}/${response?.data?.images?.[0]?.filename}`;
      if (!resultUrl) {
        throw new Error("No result image found in response");
      }
      console.log("Background removal successful:", resultUrl);
      return {
        result: resultUrl,
        pid: pid
      };
    } catch (error) {
      console.log("Error proses remove background:", error?.message || error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new BackgroundRemover();
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