import axios from "axios";
class FluxWebUI {
  constructor() {
    this.api = "https://fluxwebui.com/generate";
  }
  async generateImage({
    prompt = "1girl",
    ...params
  }) {
    const defaultParams = {
      width: 1024,
      height: 576,
      seed: 43,
      model: "flux",
      nologo: true,
      nofeed: true,
      ...params
    };
    const queryParams = new URLSearchParams(defaultParams);
    try {
      const {
        data
      } = await axios.get(`${this.api}/${prompt}?${queryParams.toString()}`, {
        responseType: "arraybuffer"
      });
      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    error: "Prompt is required"
  });
  try {
    const flux = new FluxWebUI();
    const imageData = await flux.generateImage({
      prompt: prompt,
      ...params
    });
    res.setHeader("Content-Type", "image/png").send(Buffer.from(imageData));
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}