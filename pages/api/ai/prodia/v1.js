import {
  Prodia
} from "prodia.js";
export default async function handler(req, res) {
  const {
    action,
    job_id,
    prompt,
    model,
    sourceUrl,
    targetUrl,
    ...customParams
  } = req.method === "GET" ? req.query : req.body;
  const prodiaApiKey = ["7e33be3f-5af6-42b2-854b-6439b3732050", "48847940-aded-4214-9400-333c518105f0", "69dc2e5b-24b3-426e-952f-6a36fbd69722", "5f4179ac-0d29-467c-bfbc-32db97afa1d4", "dc80a8a4-0b98-4d54-b3e4-b7c797bc2527"][Math.floor(Math.random() * 5)];
  const {
    generateImage,
    transform,
    inpainting,
    controlNet,
    generateImageSDXL,
    transformSDXL,
    inpaintingSDXL,
    upscale,
    faceSwap,
    faceRestore,
    getJob,
    getModels,
    getSDXLModels,
    getSamplers,
    getSDXLSamplers,
    getLoras,
    getSDXLLoras,
    getEmbeddings,
    getSDXLEmbeddings,
    wait
  } = Prodia(prodiaApiKey);
  try {
    let result;
    switch (action) {
      case "generate":
        result = await generateImage({
          prompt: prompt,
          model: model,
          ...customParams
        });
        break;
      case "transform":
        result = await transform({
          imageUrl: sourceUrl,
          prompt: prompt,
          model: model,
          ...customParams
        });
        break;
      case "inpainting":
        result = await inpainting({
          imageUrl: sourceUrl,
          prompt: prompt,
          model: model,
          ...customParams
        });
        break;
      case "controlNet":
        result = await controlNet({
          imageUrl: sourceUrl,
          prompt: prompt,
          model: model,
          ...customParams
        });
        break;
      case "sdxl":
        result = await generateImageSDXL({
          prompt: prompt,
          model: model,
          ...customParams
        });
        break;
      case "transformSDXL":
        result = await transformSDXL({
          imageUrl: sourceUrl,
          prompt: prompt,
          model: model,
          ...customParams
        });
        break;
      case "inpaintingSDXL":
        result = await inpaintingSDXL({
          imageUrl: sourceUrl,
          prompt: prompt,
          model: model,
          ...customParams
        });
        break;
      case "upscale":
        result = await upscale({
          imageUrl: sourceUrl,
          ...customParams
        });
        break;
      case "faceswap":
        result = await faceSwap({
          sourceUrl: sourceUrl,
          targetUrl: targetUrl,
          ...customParams
        });
        break;
      case "facerestore":
        result = await faceRestore({
          imageUrl: sourceUrl,
          ...customParams
        });
        break;
      case "getJob":
        result = await getJob(job_id);
        break;
      case "getModels":
        result = await getModels();
        break;
      case "getSDXLModels":
        result = await getSDXLModels();
        break;
      case "getSamplers":
        result = await getSamplers();
        break;
      case "getSDXLSamplers":
        result = await getSDXLSamplers();
        break;
      case "getLoras":
        result = await getLoras();
        break;
      case "getSDXLLoras":
        result = await getSDXLLoras();
        break;
      case "getEmbeddings":
        result = await getEmbeddings();
        break;
      case "getSDXLEmbeddings":
        result = await getSDXLEmbeddings();
        break;
      default:
        return res.status(400).json({
          error: "Invalid action specified"
        });
    }
    const finalResult = typeof result === "object" && result.job_id ? await wait(result) : result;
    return res.status(200).json({
      result: finalResult
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}