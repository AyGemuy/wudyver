import axios from "axios";
const sanai = {
  create: async (prompt = "Example", weight = 1024, height = 1024, guiscale = 5, paguiscale = 2, nis = 18, step = 20, sid = -1) => {
    const url = "https://api.freesana.ai/v1/images/generate";
    const headers = {
      authority: "api.freesana.ai",
      origin: "https://freesana.ai",
      referer: "https://freesana.ai/",
      "user-agent": "Postify/1.0.0"
    };
    const data = {
      prompt: prompt,
      model: "sana_1_6b",
      width: weight,
      height: height,
      guidance_scale: guiscale,
      pag_guidance_scale: paguiscale,
      num_inference_steps: nis,
      steps: step,
      seed: sid
    };
    try {
      const response = await axios.post(url, data, {
        headers: headers
      });
      const {
        id,
        status,
        result,
        processingTime,
        width,
        height,
        nsfw,
        seed
      } = response.data;
      return {
        id: id,
        status: status,
        result: result,
        processingTime: processingTime,
        width: width,
        height: height,
        nsfw: nsfw,
        seed: seed
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
};
export default async function handler(req, res) {
  if (req.method === "GET" || req.method === "POST") {
    const {
      prompt,
      weight,
      height,
      guiscale,
      paguiscale,
      nis,
      step,
      sid
    } = req.method === "GET" ? req.query : req.body;
    try {
      const response = await sanai.create(prompt || "Example", parseInt(weight) || 1024, parseInt(height) || 1024, parseInt(guiscale) || 5, parseInt(paguiscale) || 2, parseInt(nis) || 18, parseInt(step) || 20, parseInt(sid) || -1);
      const base64Image = response.result.split(",")[1];
      const buffer = Buffer.from(base64Image, "base64");
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(buffer);
    } catch (error) {
      res.status(500).json({
        error: "Failed to generate image"
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}