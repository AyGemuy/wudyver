import axios from "axios";
import qs from "qs";
class ModelsLab {
  constructor() {
    this.apiKeys = ["1C2E4Cy0VlkWDY0Gfmdrz6pwFCKDIqln3lPzo255aFmAYEsrq0jkUz9kdWUu", "RDJVo1tF5HfmXrq9842CsrlxqCzsMTodlJVjy8LVE4T8H9BiKfQy9wTda0Mp"];
    this.apiKey = this.randKey();
    this.baseUrl = "https://modelslab.com/api/v6/realtime/";
    this.defaultImage = "https://banggaikep.go.id/portal/wp-content/uploads/2024/03/jokowi-1-845x321.jpg";
  }
  randKey() {
    return this.apiKeys[Math.floor(Math.random() * this.apiKeys.length)];
  }
  async txt2img(data = {}) {
    const payload = {
      key: data.apikey || this.apiKey,
      prompt: data.prompt || "default prompt",
      negative_prompt: data.negativePrompt || "",
      samples: data.samples || "1",
      width: data.width || "1024",
      height: data.height || "1024",
      safety_checker: false,
      guidance_scale: data.guidance_scale || 7,
      num_inference_steps: data.num_inference_steps || 30,
      seed: data.seed || null,
      webhook: null,
      track_id: null,
      ...data
    };
    try {
      const res = await axios.post(this.baseUrl + "text2img", payload, {
        headers: {
          "content-type": "application/json"
        }
      });
      return res.data;
    } catch (e) {
      throw new Error(e.response?.data || e.message);
    }
  }
  async img2img(data = {}) {
    const payload = qs.stringify({
      key: data.apikey || this.apiKey,
      prompt: data.prompt || "default prompt",
      negative_prompt: data.negativePrompt || "",
      samples: data.samples || "1",
      guidance_scale: data.guidance_scale || 4,
      height: data.height || 1024,
      width: data.width || 1024,
      num_inference_steps: data.num_inference_steps || 20,
      init_image: data.imageUrl || this.defaultImage,
      strength: data.strength || .6,
      ...data
    });
    try {
      const res = await axios.post(this.baseUrl + "img2img", payload, {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      return res.data;
    } catch (e) {
      throw new Error(e.response?.data || e.message);
    }
  }
  async inpaint(data = {}) {
    const payload = qs.stringify({
      key: data.apikey || this.apiKey,
      prompt: data.prompt || "default prompt",
      negative_prompt: data.negativePrompt || "",
      samples: data.samples || "1",
      guidance_scale: data.guidance_scale || 4,
      height: data.height || 1024,
      width: data.width || 1024,
      num_inference_steps: data.num_inference_steps || 20,
      init_image: data.imageUrl || this.defaultImage,
      mask_image: data.maskUrl || this.defaultImage,
      strength: data.strength || .6,
      ...data
    });
    try {
      const res = await axios.post(this.baseUrl + "inpaint", payload, {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      return res.data;
    } catch (e) {
      throw new Error(e.response?.data || e.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "txt2img | img2img | inpaint"
      }
    });
  }
  const lab = new ModelsLab();
  try {
    let result;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await lab.txt2img(params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl (required for ${action})`
          });
        }
        result = await lab.img2img(params);
        break;
      case "inpaint":
        if (!params.imageUrl || !params.maskUrl) {
          return res.status(400).json({
            error: `Missing required fields: imageUrl and maskUrl (required for ${action})`
          });
        }
        result = await lab.inpaint(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: txt2img | img2img | inpaint`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}