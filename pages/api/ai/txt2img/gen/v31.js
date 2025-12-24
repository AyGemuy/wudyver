import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class AIImageGenerator {
  constructor() {
    this.baseURL = "https://api.ai-top.co/v1/gen_img/";
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://image-ai.pro",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://image-ai.pro/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.styles = [{
      id: "none",
      label: "No Style"
    }, {
      id: "digital_art",
      label: "Digital Art"
    }, {
      id: "neon_punk",
      label: "Neon Punk"
    }, {
      id: "line_art",
      label: "Line Art"
    }, {
      id: "pixel_art",
      label: "Pixel Art"
    }, {
      id: "photographic",
      label: "Photographic"
    }, {
      id: "analog_film",
      label: "Analog Film"
    }, {
      id: "origami",
      label: "Origami"
    }, {
      id: "3d_model",
      label: "3D Model"
    }, {
      id: "anime",
      label: "Anime"
    }, {
      id: "fantasy_art",
      label: "Fantasy Art"
    }, {
      id: "low_poly",
      label: "Low Poly"
    }, {
      id: "cinematic",
      label: "Cinematic"
    }, {
      id: "enhance",
      label: "Enhance"
    }, {
      id: "comic_book",
      label: "Comic Book"
    }, {
      id: "isometric",
      label: "Isometric"
    }, {
      id: "craft_clay",
      label: "Craft Clay"
    }];
    this.colors = [{
      id: "none",
      label: "No Color Effect"
    }, {
      id: "warm_tone",
      label: "Warm Tone"
    }, {
      id: "cool_tone",
      label: "Cool Tone"
    }, {
      id: "muted_colors",
      label: "Muted Colors"
    }, {
      id: "vibrant_colors",
      label: "Vibrant Colors"
    }, {
      id: "pastel_colors",
      label: "Pastel Colors"
    }, {
      id: "black_and_white",
      label: "Black and White"
    }];
    this.lights = [{
      id: "none",
      label: "No Lighting Effect"
    }, {
      id: "backlight",
      label: "Backlight"
    }, {
      id: "dramatic",
      label: "Dramatic"
    }, {
      id: "volumetric",
      label: "Volumetric"
    }, {
      id: "dimly_lit",
      label: "Dimly Lit"
    }, {
      id: "crepuscular_rays",
      label: "Crepuscular Rays"
    }, {
      id: "studio",
      label: "Studio"
    }, {
      id: "sunlight",
      label: "Sunlight"
    }, {
      id: "low_light",
      label: "Low Light"
    }, {
      id: "rim_lighting",
      label: "Rim Lighting"
    }, {
      id: "golden_hour",
      label: "Golden Hour"
    }];
    this.compositions = [{
      id: "none",
      label: "No Composition Effect"
    }, {
      id: "blurry_background",
      label: "Blurry Background"
    }, {
      id: "close_up",
      label: "Close Up"
    }, {
      id: "wide_angle",
      label: "Wide Angle"
    }, {
      id: "narrow_depth_of_field",
      label: "Narrow Depth of Field"
    }, {
      id: "shot_from_below",
      label: "Shot from Below"
    }, {
      id: "shot_from_above",
      label: "Shot from Above"
    }, {
      id: "macro_photography",
      label: "Macro Photography"
    }];
  }
  async generate({
    prompt = "a beautiful landscape",
    ...rest
  }) {
    try {
      if (!prompt || prompt.trim().length === 0) {
        throw new Error("Prompt is required");
      }
      const defaultData = {
        is_gpt: false,
        radio: "portrait",
        high_quality: false,
        content_moderation: false,
        style: "photographic",
        color: "vibrant_colors",
        light: "golden_hour",
        composition: "wide_angle",
        platform: "web",
        user_id: "",
        vip_level: -1
      };
      const requestData = {
        ...defaultData,
        prompt: prompt.trim(),
        ...rest
      };
      this.validateOptions(rest);
      const response = await axios.post(this.baseURL, requestData, {
        headers: this.defaultHeaders
      });
      return response.data;
    } catch (error) {
      console.error("Error generating image:", error);
      throw error;
    }
  }
  validateOptions(options) {
    if (options.style && !this.styles.some(style => style.id === options.style)) {
      throw new Error(`Invalid style: ${options.style}`);
    }
    if (options.color && !this.colors.some(color => color.id === options.color)) {
      throw new Error(`Invalid color: ${options.color}`);
    }
    if (options.light && !this.lights.some(light => light.id === options.light)) {
      throw new Error(`Invalid light: ${options.light}`);
    }
    if (options.composition && !this.compositions.some(comp => comp.id === options.composition)) {
      throw new Error(`Invalid composition: ${options.composition}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const imageGenerator = new AIImageGenerator();
  try {
    const data = await imageGenerator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}