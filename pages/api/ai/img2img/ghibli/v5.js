import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class GhibliArtGenerator {
  constructor() {
    this.baseUrl = "https://ghibliartai.erweima.ai/api/v2";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://ghibliart.ai",
      priority: "u=1, i",
      referer: "https://ghibliart.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.prompts = ["Convert this image into a whimsical, magical Ghibli-style, keeping all elements the same, but applying soft textures, gentle shading, and pastel tones.", "Change the style of this image to Studio Ghibli, but do not add any new elements. Apply subtle shading, lighting, and hand-painted textures to create a dreamy atmosphere.", "Recreate this image in Studio Ghibli's signature style, preserving the composition and details, focusing on soft textures, lighting, and vibrant pastel colors.", "Apply a Studio Ghibli-style transformation to this image, using magical lighting, smooth shading, and soft colors, while keeping the original scene and objects unchanged.", "Transform this image into a gentle, Ghibli-style illustration without adding new elements, using warm, pastel colors, soft textures, and whimsical lighting.", "Transform this image into a soft, Ghibli-style illustration with gentle textures, warm pastel colors, and no new elements added to the scene.", "Convert this image into a dreamy Ghibli-style artwork, maintaining the original scene but applying soft shading, whimsical lighting, and painterly textures.", "Turn this picture into a Studio Ghibli animated style, maintaining 100% of the original image’s composition, details, and subjects.", "Reimagine this image in Studio Ghibli style, preserving the composition and adding magical lighting, soft colors, and painterly textures for a whimsical look."];
  }
  getRandomPrompt() {
    const randomIndex = Math.floor(Math.random() * this.prompts.length);
    return this.prompts[randomIndex];
  }
  async generate({
    imageUrl,
    prompt = this.getRandomPrompt()
  }) {
    try {
      const uniqueid = Math.random().toString(36).substring(2, 15);
      console.log(`Generating image with unique ID: ${uniqueid}`);
      const generateResponse = await axios.post(`${this.baseUrl}/generate/create`, {
        prompt: prompt,
        imageUrl: imageUrl
      }, {
        headers: {
          ...this.headers,
          uniqueid: uniqueid
        }
      });
      if (generateResponse.data.code === 200) {
        const uuid = generateResponse.data.data.recordUuid;
        console.log(`Generation started. UUID: ${uuid}`);
        return await this.pollForResult(uuid);
      } else {
        throw new Error("Generation failed.");
      }
    } catch (error) {
      console.error("Error generating image:", error.message);
    }
  }
  async pollForResult(uuid) {
    const startTime = Date.now();
    try {
      while (true) {
        const resultResponse = await axios.get(`${this.baseUrl}/generate/detail?uuid=${uuid}`, {
          headers: this.headers
        });
        if (resultResponse.data.code === 200) {
          const {
            state,
            imageUrl
          } = resultResponse.data.data;
          if (state === "success" && imageUrl) {
            console.log("Image generated successfully.");
            return resultResponse.data.data;
          } else if (state === "fail") {
            throw new Error("Image generation failed.");
          }
        }
        if (Date.now() - startTime > 36e5) {
          throw new Error("Polling timed out.");
        }
        console.log("Waiting for result...");
        await new Promise(resolve => setTimeout(resolve, 3e3));
      }
    } catch (error) {
      console.error("Error checking result:", error.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const ghibliArt = new GhibliArtGenerator();
  try {
    const data = await ghibliArt.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}