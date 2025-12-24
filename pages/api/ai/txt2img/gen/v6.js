import fetch from "node-fetch";
const NeuralBlender = async prompt => {
  const url = "https://nb3corsproxyfunction2.azurewebsites.net/api/corsproxy/render";
  const blends = ["mnemosyne", "nb3"];
  const randomBlend = blends[Math.floor(Math.random() * blends.length)];
  const options = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
      Referer: "https://neuralblender.com/create-art"
    },
    body: JSON.stringify({
      prompt: prompt,
      blend: randomBlend,
      num_inference_steps: randomBlend === "nb3" ? 4 : 25,
      guidance_scale: randomBlend === "nb3" ? 3.5 : 7.5
    })
  };
  try {
    const response = await fetch(url, options);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  } catch (error) {
    console.error("Error fetching from neuralblender:", error);
    throw error;
  }
};
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt parameter is required"
    });
  }
  try {
    const result = await NeuralBlender(prompt);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="generated_image.png"');
    return res.status(200).send(Buffer.from(result));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to fetch image from Bing"
    });
  }
}