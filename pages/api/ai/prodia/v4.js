// pages/api/prodia.js

import { Prodia } from "prodia.js";

export default async function handler(req, res) {
  const { prompt, model, action, sourceUrl, targetUrl } = req.query;
  const prodiaApiKey = [
    "7e33be3f-5af6-42b2-854b-6439b3732050",
    "48847940-aded-4214-9400-333c518105f0",
    "69dc2e5b-24b3-426e-952f-6a36fbd69722",
    "5f4179ac-0d29-467c-bfbc-32db97afa1d4",
    "dc80a8a4-0b98-4d54-b3e4-b7c797bc2527",
  ][Math.floor(Math.random() * 5)];

  const { generateImage, transform, generateImageSDXL, faceSwap, faceRestore, wait } = Prodia(prodiaApiKey);

  try {
    const result = action === "generate" ? await generateImage({
        prompt: prompt || "a default prompt",
        model: model || "juggernaut_aftermath.safetensors [5e20c455]",
      }) :
      action === "transform" ? await transform({
        imageUrl: sourceUrl,
        prompt: prompt || "",
        model: model || "juggernaut_aftermath.safetensors [5e20c455]",
      }) :
      action === "sdxl" ? await generateImageSDXL({
        prompt: prompt || "a default prompt",
        model: model || "sd_xl_base_1.0.safetensors [be9edd61]",
        style_preset: "photographic",
      }) :
      action === "faceswap" ? await faceSwap({
        sourceUrl: sourceUrl,
        targetUrl: targetUrl,
      }) :
      action === "facerestore" ? await faceRestore({
        imageUrl: sourceUrl,
      }) : null;

    if (!result) return res.status(400).json({ error: "Invalid action specified" });

    const finalResult = await wait(result);
    return res.status(200).json({ result: finalResult });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
