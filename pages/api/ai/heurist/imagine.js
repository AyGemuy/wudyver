import axios from "axios";
const parseResponse = response => {
  const lines = response.split("\n");
  const line = lines.find(line => line.startsWith("1:"));
  if (line) {
    const jsonString = line.slice(2).trim();
    try {
      const parsedData = JSON.parse(jsonString);
      return parsedData;
    } catch (error) {
      return null;
    }
  }
  return null;
};
class Heurist {
  constructor() {
    this.url = "https://imagine.heurist.ai/models/";
    this.headers = {
      accept: "text/x-component",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "text/plain;charset=UTF-8",
      "next-action": "a6fbbd1f3d3be1c0f57d10c2fd445817aad75870",
      "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22models%22%2C%7B%22children%22%3A%5B%5B%22slug%22%2C%22BrainDance%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fmodels%2FBrainDance%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      cookie: "_ga=GA1.1.1762423261.1735607627; _ga_B94HB7EM0Q=GS1.1.1735607626.1.1.1735607645.0.0.0",
      Referer: "https://imagine.heurist.ai/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    };
  }
  async generateImage({
    prompt = "Master",
    neg_prompt = "(worst quality: 1.4), bad quality, nsfw",
    num_iterations = 25,
    guidance_scale = 5,
    width = 512,
    height = 768,
    seed = -1,
    model = "BrainDance"
  }) {
    const payload = [{
      prompt: prompt,
      neg_prompt: neg_prompt,
      num_iterations: num_iterations,
      guidance_scale: guidance_scale,
      width: width,
      height: height,
      seed: seed,
      model: model
    }];
    try {
      const response = await axios.post(`${this.url}${model}`, payload, {
        headers: this.headers
      });
      return {
        parsed: parseResponse(response.data),
        response: response.data
      };
    } catch (error) {
      throw new Error("Failed to generate image: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const heurist = new Heurist();
  const {
    query,
    body
  } = req;
  try {
    const payload = req.method === "POST" ? body : {
      prompt: query.prompt || "Master",
      neg_prompt: query.neg_prompt || "(worst quality: 1.4), bad quality, nsfw",
      num_iterations: query.num_iterations || 25,
      guidance_scale: query.guidance_scale || 5,
      width: query.width || 512,
      height: query.height || 768,
      seed: query.seed || -1,
      model: query.model || "BrainDance"
    };
    const result = await heurist.generateImage(payload);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message
    });
  }
}