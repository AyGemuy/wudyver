import fetch from "node-fetch";
class GetImg {
  constructor() {
    this.modelsCache = [];
    this.modelsUrl = "https://getimg.ai/api/models?status=active&public=true";
    this.randomPromptUrl = "https://getimg.ai/api/prompts/random";
  }
  async models() {
    if (!this.modelsCache.length) {
      const response = await fetch(this.modelsUrl);
      if (!response.ok) throw new Error("Failed to fetch models");
      const data = await response.json();
      this.modelsCache = data;
    }
    return this.modelsCache.map((model, index) => ({
      index: index,
      id: model.id
    }));
  }
  async create({
    model,
    prompt = null,
    random = false,
    ratio = "512,512",
    fix = false,
    quality = 1,
    steps = 25,
    gscale = 9,
    nprompt = "Disfigured, cartoon, blurry, nude"
  }) {
    const models = await this.models();
    if (model < 0 || model >= models.length) {
      throw new Error("Invalid model index");
    }
    const selectedModel = models[model].id;
    let effectivePrompt = prompt;
    if (!effectivePrompt && random) {
      const randomResponse = await fetch(this.randomPromptUrl);
      if (!randomResponse.ok) throw new Error("Failed to fetch random prompt");
      const randomData = await randomResponse.json();
      effectivePrompt = randomData.prompt;
    }
    if (!effectivePrompt) {
      throw new Error("Prompt is required if random is false");
    }
    const [width, height] = ratio.split(",").map(Number);
    const payload = {
      tool: "generator",
      num_inference_steps: steps >= 1 && steps <= 75 ? steps : 1,
      guidance_scale: gscale >= 0 && gscale <= 20 ? gscale : 9,
      num_images: quality >= 1 && quality <= 10 ? quality : 1,
      width: width || 512,
      height: height || 512,
      enhance_face: fix,
      scheduler: "dpmsolver++",
      prompt: effectivePrompt,
      negative_prompt: nprompt
    };
    const response = await fetch(`https://getimg.ai/api/models/${selectedModel}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error("Failed to generate image");
    }
    return response.json();
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...query
  } = req.method === "GET" ? req.query : req.body;
  const getImg = new GetImg();
  try {
    if (action === "model") {
      const models = await getImg.models();
      return res.status(200).json(models);
    }
    if (action === "create") {
      const {
        model,
        prompt,
        random = false,
        ratio = "512,512",
        fix = false,
        quality = 1,
        steps = 25,
        gscale = 9,
        nprompt = "Disfigured, cartoon, blurry, nude"
      } = query;
      if (!model) {
        return res.status(400).json({
          error: "model is required"
        });
      }
      const result = await getImg.create({
        model: parseInt(model, 10),
        prompt: prompt,
        random: random === "true",
        ratio: ratio,
        fix: fix === "true",
        quality: parseInt(quality, 10),
        steps: parseInt(steps, 10),
        gscale: parseInt(gscale, 10),
        nprompt: nprompt
      });
      return res.status(200).json(result);
    }
    return res.status(400).json({
      error: "Invalid action"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}