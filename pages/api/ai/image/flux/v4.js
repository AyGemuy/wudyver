import axios from "axios";
export default async function handler(req, res) {
  const input = req.method === "GET" ? req.query : req.body;
  const {
    prompt,
    aspect_ratio = "9:16",
    email = null,
    go_fast = true,
    megapixels = "1",
    num_outputs = 1,
    output_format = "png",
    output_quality = 80,
    num_inference_steps = 4
  } = input;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  try {
    const response = await axios.post("https://developersoft.in/api/v3-gen", {
      prompt: prompt,
      aspect_ratio: aspect_ratio,
      email: email,
      go_fast: go_fast,
      megapixels: megapixels,
      num_outputs: num_outputs,
      output_format: output_format,
      output_quality: output_quality,
      num_inference_steps: num_inference_steps
    }, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://developersoft.in/?via=topaitools"
      }
    });
    return res.status(200).json({
      result: response.data
    });
  } catch (error) {
    return res.status(500).json({
      error: "Error processing request"
    });
  }
}