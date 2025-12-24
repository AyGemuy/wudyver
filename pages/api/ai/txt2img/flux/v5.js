import axios from "axios";
class ImageGenerator {
  constructor() {
    this.apiUrl = "https://fluxschellgenerateimage-vsgfrtggnq-uc.a.run.app/";
  }
  async generateImage({
    prompt = "A young girl exploring a magical forest with spirits hiding among trees, in the Studio Ghibli anime style, fantasy, detailed",
    width = 576,
    height = 1024,
    steps = 4,
    scale = 7.5,
    negative_prompt = "blurry, low quality, distorted, deformed",
    output = 1,
    ratio = "9:16"
  }) {
    const headers = {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
      referer: "https://www.ghibliimagegenerator.io/generator"
    };
    const data = {
      prompt: prompt,
      width: width,
      height: height,
      num_inference_steps: steps,
      guidance_scale: scale,
      negative_prompt: negative_prompt,
      num_outputs: output,
      aspect_ratio: ratio
    };
    try {
      const response = await axios.post(this.apiUrl, data, {
        headers: headers
      });
      if (!response.data) {
        throw new Error("No data returned from image generation.");
      }
      return response.data;
    } catch (error) {
      throw new Error("Error generating image: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const imageGenerator = new ImageGenerator();
  try {
    const data = await imageGenerator.generateImage(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}