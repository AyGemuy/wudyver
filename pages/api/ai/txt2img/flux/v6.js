import axios from "axios";
const FOOOCUS_BASE_URL = "https://fooocus.one";
const FOOOCUS_GENERATE_PATH = "/api/flux-generate";
const FOOOCUS_HEADERS = {
  accept: "*/*",
  "accept-language": "id-ID,id;q=0.9",
  "content-type": "application/json",
  origin: "https://fooocus.one",
  referer: "https://fooocus.one/id/playground",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
};
class FooocusService {
  async generateImage({
    prompt = "girl",
    steps = 4
  }) {
    try {
      const response = await axios.post(FOOOCUS_BASE_URL + FOOOCUS_GENERATE_PATH, {
        prompt: prompt,
        steps: steps
      }, {
        headers: FOOOCUS_HEADERS
      });
      return response.data;
    } catch (error) {
      console.error("Fooocus API Error:", error);
      return {
        error: true,
        message: "Failed to communicate with Fooocus API"
      };
    }
  }
}
export default async function handler(req, res) {
  const data = req.method === "GET" ? req.query : req.body;
  const {
    prompt,
    steps
  } = data;
  if (!prompt) {
    return res.status(400).json({
      error: "Missing required field: prompt"
    });
  }
  try {
    const fooocusService = new FooocusService();
    const generationResult = await fooocusService.generateImage({
      prompt: prompt,
      steps: steps
    });
    if (generationResult?.result?.image) {
      const imageBuffer = Buffer.from(generationResult.result.image, "base64");
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", 'inline; filename="generated_image.png"');
      return res.send(imageBuffer);
    } else {
      return res.status(500).json({
        message: generationResult?.message || "Failed to generate image"
      });
    }
  } catch (error) {
    console.error("API Handler Error:", error);
    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
}