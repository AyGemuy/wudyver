import axios from "axios";
const fluximg = {
  ratios: ["1:1", "16:9", "2:3", "3:2", "4:5", "5:4", "9:16", "21:9", "9:21"],
  create: async (prompt, ration = 2) => {
    if (ration < 1 || ration > fluximg.ratios.length) {
      console.log("Rasio image tidak valid!");
      return null;
    }
    const config = {
      headers: {
        accept: "*/*",
        authority: "1yjs1yldj7.execute-api.us-east-1.amazonaws.com",
        "user-agent": "Postify/1.0.0"
      }
    };
    try {
      const response = await axios.get(`https://1yjs1yldj7.execute-api.us-east-1.amazonaws.com/default/ai_image?prompt=${encodeURIComponent(prompt)}&aspect_ratio=${fluximg.ratios[ration - 1]}`, config);
      const responseBuffer = await axios.get(response.data.image_link, {
        ...config,
        responseType: "arraybuffer"
      });
      return responseBuffer.data;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch image");
    }
  }
};
export default async function handler(req, res) {
  const {
    prompt,
    ration
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: 'Query parameter "prompt" is required.'
    });
  }
  try {
    const ratio = ration ? parseInt(ration) : 2;
    const imageBuffer = await fluximg.create(prompt, ratio);
    if (!imageBuffer) {
      return res.status(400).json({
        error: "Invalid ratio or other error"
      });
    }
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="generated_image.png"');
    return res.status(200).send(Buffer.from(imageBuffer));
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}