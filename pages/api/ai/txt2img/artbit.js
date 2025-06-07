import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    prompt: captionInput,
    model: captionModel,
    ratio: selectedRatio,
    sample: selectedSamples,
    negative: negativePrompt
  } = method === "GET" ? req.query : req.body;
  return await processRequest(captionInput, captionModel, selectedRatio, selectedSamples, negativePrompt, res);
}
async function processRequest(captionInput, captionModel, selectedRatio, selectedSamples, negativePrompt, res) {
  if (!captionInput) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    Referer: "https://artbit.ai/"
  };
  const payload = {
    captionInput: captionInput,
    captionModel: captionModel || "ae-sdxl-v1",
    selectedRatio: selectedRatio || "512",
    selectedSamples: selectedSamples || "1",
    negative_prompt: negativePrompt || ""
  };
  try {
    const response = await fetch("https://artbit.ai/api/generateImage", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      return res.status(response.status).json({
        error: "Failed to generate image"
      });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}