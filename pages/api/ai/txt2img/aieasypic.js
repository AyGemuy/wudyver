import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class AIImageAPI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.baseURL = "https://api.aieasypic.com/api";
    this.photoURL = "https://aieasyphoto.com/api/next-api/proxy";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      "x-current-url": "https://aieasypic.com/text-to-image"
    };
    this.photoHeaders = {
      "x-fal-queue-priority": "normal"
    };
  }
  async create({
    type,
    prompt = "",
    model = 694648,
    negative_prompt = "(((nude))), (((naked))), (worst quality:1.6, low quality:1.6), (zombie, sketch, interlocked fingers, comic)",
    batch_size = 2,
    cfg_scale = "1.0",
    sampler_name = "Euler",
    seed = -1,
    steps = 8,
    width = 768,
    height = 1152,
    hr_scale = "1.5",
    enable_hr = false,
    hr_second_pass_steps = 10,
    hr_upscaler = "ESRGAN_4x",
    denoising_strength = "0.5",
    controlnet_parameters = [],
    loras = [{
      id: 774008,
      weight: .125
    }],
    lora_models = [774008],
    image_url = "",
    output_format = "png",
    num_images = 1,
    num_inference_steps = 8,
    guidance_scale = 1.5,
    safety_checker_version = "v1",
    format = "jpeg",
    safety_checker = true,
    target_url = "",
    extra_params = {}
  }) {
    try {
      let url, data, headers, method = "post";
      switch (type) {
        case "inference":
          url = `${this.baseURL}/inference_jobs/`;
          data = {
            model: model,
            parameters: {
              prompt: prompt,
              negative_prompt: negative_prompt,
              batch_size: batch_size,
              cfg_scale: cfg_scale,
              sampler_name: sampler_name,
              seed: seed,
              steps: steps,
              width: width,
              height: height,
              hr_scale: hr_scale,
              enable_hr: enable_hr,
              hr_second_pass_steps: hr_second_pass_steps,
              hr_upscaler: hr_upscaler,
              denoising_strength: denoising_strength,
              controlnet_parameters: controlnet_parameters,
              id: 1,
              model: "",
              extra_json: {
                loras: loras
              },
              lora_models: lora_models,
              ...extra_params
            }
          };
          headers = this.headers;
          break;
        case "status":
          url = `${this.baseURL}/inference_jobs/${prompt}/success_detail/`;
          headers = this.headers;
          method = "get";
          break;
        case "upscale":
          url = this.photoURL;
          data = {
            image_url: image_url,
            scale: 2,
            ...extra_params
          };
          headers = {
            ...this.photoHeaders,
            "x-fal-target-url": "https://queue.fal.run/fal-ai/esrgan"
          };
          break;
        case "lightning":
          url = this.photoURL;
          data = {
            prompt: prompt,
            num_images: num_images,
            image_size: {
              width: width,
              height: height
            },
            num_inference_steps: num_inference_steps,
            seed: seed,
            model_name: "SG161222/RealVisXL_V4.0_Lightning",
            guidance_scale: guidance_scale,
            loras: loras,
            enable_safety_checker: safety_checker,
            format: format,
            safety_checker_version: safety_checker_version,
            negative_prompt: negative_prompt,
            ...extra_params
          };
          headers = {
            ...this.photoHeaders,
            "x-fal-target-url": "https://queue.fal.run/fal-ai/lightning-models"
          };
          break;
        case "schnell":
          url = this.photoURL;
          data = {
            prompt: prompt,
            num_images: num_images,
            image_size: {
              width: width,
              height: height
            },
            num_inference_steps: num_inference_steps,
            seed: seed,
            ...extra_params
          };
          headers = {
            ...this.photoHeaders,
            "x-fal-target-url": "https://queue.fal.run/fal-ai/flux/schnell"
          };
          break;
        case "convert":
          url = this.photoURL;
          data = {
            image_url: image_url,
            output_format: output_format,
            ...extra_params
          };
          headers = {
            ...this.photoHeaders,
            "x-fal-target-url": "https://queue.fal.run/fal-ai/birefnet/v2"
          };
          break;
        case "custom":
          url = this.photoURL;
          data = {
            prompt: prompt,
            ...extra_params
          };
          headers = {
            ...this.photoHeaders,
            "x-fal-target-url": target_url
          };
          break;
        default:
          throw new Error("Invalid type parameter");
      }
      const response = method === "get" ? await this.client.get(url, {
        headers: headers
      }) : await this.client.post(url, data, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error(`Error in ${type}:`, error.message);
      return null;
    }
  }
}
const VALID_TYPES = ["inference", "status", "upscale", "lightning", "schnell", "convert", "custom"];
export default async function handler(req, res) {
  try {
    const {
      type,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        error: "Invalid or missing 'type' parameter"
      });
    }
    const aiAPI = new AIImageAPI();
    const result = await aiAPI.create({
      type: type,
      ...params
    });
    if (!result) {
      return res.status(500).json({
        error: "Gagal memproses permintaan"
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}