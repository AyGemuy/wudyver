import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
import apiConfig from "@/configs/apiConfig";
class ImageService {
  constructor() {
    this.generateApiUrl = "https://workers-playground-rapid-queen-02e9.fffghbdrhfcvl.workers.dev";
    this.uploadApiUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    console.log("ImageService initialized for generation and automatic upload.");
  }
  async generate({
    prompt,
    ...rest
  }) {
    console.log(`Starting process for prompt: "${prompt}"`);
    try {
      console.log("Step 1: Requesting image generation...");
      const generationPayload = {
        prompt: prompt,
        strength: rest?.strength ?? 1,
        num_steps: rest?.num_steps || 20,
        width: rest?.width ? rest.width : 512,
        height: rest?.height ? rest.height : 512
      };
      const generationResponse = await axios.post(this.generateApiUrl, generationPayload, {
        headers: {
          "Content-Type": "application/json",
          ...SpoofHead()
        }
      });
      const generatedData = generationResponse.data;
      if (!generatedData?.image) {
        throw new Error("Image data (base64) not found in the generation response.");
      }
      console.log("Step 1: Image generated successfully.");
      console.log("Step 2: Preparing and uploading the generated image...");
      const imageBuffer = Buffer.from(generatedData.image, "base64");
      const form = new FormData();
      form.append("file", imageBuffer, {
        filename: "generated-image.png",
        contentType: "image/png"
      });
      const uploadResponse = await axios.post(this.uploadApiUrl, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      console.log("Step 2: Image uploaded successfully.");
      return uploadResponse.data;
    } catch (error) {
      console.error("An error occurred during the process:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to generate and upload image");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new ImageService();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}