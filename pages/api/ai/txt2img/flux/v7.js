import axios from "axios";
class ImageGenerator {
  constructor() {
    this.baseURL = "https://fast-flux-demo.replicate.workers.dev/api";
  }
  async generate({
    prompt
  }) {
    if (!prompt) {
      throw new Error("Prompt is required to generate an image.");
    }
    try {
      const response = await axios.get(`${this.baseURL}/generate-image?text=${encodeURIComponent(prompt)}`, {
        responseType: "arraybuffer"
      });
      if (response.data instanceof ArrayBuffer) {
        return Buffer.from(response.data);
      } else {
        console.warn("API did not return an ArrayBuffer. Inspecting response.data:", response.data);
        throw new Error("Unexpected response format from image generation API. Expected ArrayBuffer.");
      }
    } catch (error) {
      console.error("Error generating image:", error.message);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Axios Error Response:", error.response.data);
        throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      message: "Missing prompt parameter"
    });
  }
  const generator = new ImageGenerator();
  try {
    const imageBuffer = await generator.generate({
      prompt: prompt
    });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="generated_image.png"');
    return res.send(imageBuffer);
  } catch (error) {
    console.error("Error in API route:", error);
    res.status(500).json({
      message: "Failed to generate image",
      error: error.message
    });
  }
}