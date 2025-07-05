import fetch from "node-fetch";
const AVAILABLE_MODELS = ["neversleep/llama-3-lumimaid-8b", "anthropic/claude-3.5-sonnet:beta", "openai/gpt-4o-mini", "gryphe/mythomax-l2-13b", "neversleep/llama-3-lumimaid-80b"];
const NETWRCK_CHAT_API = "https://netwrck.com/api/chatpred_or";
const NETWRCK_IMAGE_API = "https://aiproxy-416803.uc.r.appspot.com/fal";
async function ImageNetwrck(prompt) {
  try {
    const response = await fetch(NETWRCK_IMAGE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: "https://netwrck.com/"
      },
      body: JSON.stringify({
        prompt: prompt,
        model_name: "fal-ai/flux/schnell",
        image_size: "square_hd",
        num_inference_steps: 4,
        guidance_scale: 3.5,
        num_images: 3,
        enable_safety_checker: false
      })
    });
    const result = await response.json();
    return result.result?.images || [];
  } catch (error) {
    console.error("Error during image generation:", error);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await ImageNetwrck(prompt);
  return res.status(200).json(typeof result === "object" ? result : result);
}