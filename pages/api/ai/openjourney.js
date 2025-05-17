import fetch from "node-fetch";
async function Draw(prompt) {
  try {
    const response = await fetch("https://api-inference.huggingface.co/models/prompthero/openjourney-v2", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: "Bearer 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"
      },
      body: JSON.stringify({
        inputs: prompt
      })
    });
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    error: "Prompt is required"
  });
  try {
    const imageBuffer = await Draw(prompt);
    res.setHeader("Content-Type", "image/jpeg");
    return res.status(200).send(imageBuffer);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}