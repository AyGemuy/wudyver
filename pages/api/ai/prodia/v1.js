import {
  Prodia
} from "prodia.js";
class ProdiaHandler {
  constructor(apikey) {
    const keys = ["7e33be3f-5af6-42b2-854b-6439b3732050", "48847940-aded-4214-9400-333c518105f0", "69dc2e5b-24b3-426e-952f-6a36fbd69722", "5f4179ac-0d29-467c-bfbc-32db97afa1d4", "dc80a8a4-0b98-4d54-b3e4-b7c797bc2527"];
    const key = apikey || keys[Math.floor(Math.random() * keys.length)];
    Object.assign(this, Prodia(key));
  }
  async run(action, params) {
    const {
      job_id,
      prompt,
      model,
      sourceUrl,
      targetUrl,
      ...opt
    } = params;
    const actions = {
      generate: async () => await this.generateImage({
        prompt: prompt,
        model: model,
        ...opt
      }),
      transform: async () => await this.transform({
        imageUrl: sourceUrl,
        prompt: prompt,
        model: model,
        ...opt
      }),
      inpainting: async () => await this.inpainting({
        imageUrl: sourceUrl,
        prompt: prompt,
        model: model,
        ...opt
      }),
      controlnet: async () => await this.controlNet({
        imageUrl: sourceUrl,
        prompt: prompt,
        model: model,
        ...opt
      }),
      generate_sdxl: async () => await this.generateImageSDXL({
        prompt: prompt,
        model: model,
        ...opt
      }),
      transform_sdxl: async () => await this.transformSDXL({
        imageUrl: sourceUrl,
        prompt: prompt,
        model: model,
        ...opt
      }),
      inpainting_sdxl: async () => await this.inpaintingSDXL({
        imageUrl: sourceUrl,
        prompt: prompt,
        model: model,
        ...opt
      }),
      upscale: async () => await this.upscale({
        imageUrl: sourceUrl,
        ...opt
      }),
      faceswap: async () => await this.faceSwap({
        sourceUrl: sourceUrl,
        targetUrl: targetUrl,
        ...opt
      }),
      facerestore: async () => await this.faceRestore({
        imageUrl: sourceUrl,
        ...opt
      }),
      job: async () => await this.getJob(job_id),
      models: async () => await this.getModels(),
      sdxl_models: async () => await this.getSDXLModels(),
      samplers: async () => await this.getSamplers(),
      sdxl_samplers: async () => await this.getSDXLSamplers(),
      loras: async () => await this.getLoras(),
      sdxl_loras: async () => await this.getSDXLLoras(),
      embeddings: async () => await this.getEmbeddings(),
      sdxl_embeddings: async () => await this.getSDXLEmbeddings()
    };
    if (!actions[action]) {
      throw new Error(`Invalid action.\nAvailable actions: ${Object.keys(actions).join(", ")}`);
    }
    return await actions[action]();
  }
}
export default async function handler(req, res) {
  const {
    action,
    apikey,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const prodia = new ProdiaHandler(apikey);
  try {
    const result = await prodia.run(action, params);
    const final = typeof result === "object" && result.job_id ? await prodia.wait(result) : result;
    return res.status(200).json({
      result: final
    });
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
}