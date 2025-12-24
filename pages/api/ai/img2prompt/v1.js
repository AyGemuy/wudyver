import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class ImageDescriber {
  constructor() {
    this.apiUrl = "https://www.chat-mentor.com/api/ai/image-to-text/";
  }
  async describeImage(imageUrl, prompt = "Generate a text prompt for this image, focusing on visual elements, style, and key features.") {
    try {
      const base64Image = await this.getBase64Image(imageUrl);
      const response = await axios.post(this.apiUrl, {
        imageUrl: base64Image,
        prompt: prompt
      }, {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          origin: "https://www.chat-mentor.com",
          referer: "https://www.chat-mentor.com/features/image-to-prompt/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          ...SpoofHead()
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error:", error.message);
      throw error;
    }
  }
  async getBase64Image(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return `data:image/png;base64,${Buffer.from(response.data, "binary").toString("base64")}`;
    } catch (error) {
      console.error("Error fetching image:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url: imageUrl,
    prompt = "describing the image below for image generation. Focus on essential details for accurate results."
  } = req.method === "GET" ? req.query : req.body;
  if (!imageUrl) {
    return res.status(400).json({
      error: "Paramenter url harus diisi!"
    });
  }
  const describer = new ImageDescriber();
  try {
    const result = await describer.describeImage(imageUrl, prompt);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Terjadi kesalahan dalam proses deskripsi gambar."
    });
  }
}