import axios from "axios";
import apiConfig from "@/configs/apiConfig";
const ACTION_REQUIREMENTS = {
  prompt: ["canvas", "text2ghibli2", "txt2ghbli", "nsfw"],
  url: ["hijabkan", "hytam", "jadibabi", "figure"],
  prompt_url: ["custom"],
  style_url: ["style"]
};
const ACTION_EXAMPLES = {
  canvas: {
    description: "Generate image from text prompt",
    example: {
      action: "canvas",
      prompt: "a beautiful sunset"
    }
  },
  text2ghibli2: {
    description: "Convert text to Ghibli-style image",
    example: {
      action: "text2ghibli2",
      prompt: "a forest spirit"
    }
  },
  txt2ghbli: {
    description: "Alternative Ghibli-style text to image",
    example: {
      action: "txt2ghbli",
      prompt: "a flying castle"
    }
  },
  nsfw: {
    description: "Generate NSFW content from text",
    example: {
      action: "nsfw",
      prompt: "erotic description"
    }
  },
  hijabkan: {
    description: "Add hijab to an image",
    example: {
      action: "hijabkan",
      url: "https://example.com/photo.jpg"
    }
  },
  figure: {
    description: "Apply figure filter to an image",
    example: {
      action: "figure",
      url: "https://example.com/photo.jpg"
    }
  },
  hytam: {
    description: "Apply Hytam filter to an image",
    example: {
      action: "hytam",
      url: "https://example.com/photo.jpg"
    }
  },
  jadibabi: {
    description: "Transform image to pig-like appearance",
    example: {
      action: "jadibabi",
      url: "https://example.com/photo.jpg"
    }
  },
  custom: {
    description: "Custom image generation with prompt and URL",
    example: {
      action: "custom",
      prompt: "a futuristic city",
      url: "https://example.com/base.jpg"
    }
  },
  style: {
    description: "Apply style to an image",
    example: {
      action: "style",
      style: "van gogh",
      url: "https://example.com/photo.jpg"
    }
  }
};
class AIImageGenerator {
  constructor() {
    this.apiKey = apiConfig.PASSWORD;
    this.baseURL = `https://${apiConfig.DOMAIN_VERCEL}/ai-image`;
  }
  async generate({
    action,
    prompt,
    url,
    style
  }) {
    this.validateParams(action, prompt, url, style);
    const params = {
      apikey: this.apiKey
    };
    if (prompt) params.prompt = prompt;
    if (url) params.url = url;
    if (style) params.style = style;
    try {
      const response = await axios.get(`${this.baseURL}/${action}`, {
        params: params,
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      console.error("Error generating image:", error.response?.data?.toString() || error.message);
      throw new Error("Failed to generate image from external API.");
    }
  }
  getActionExamples() {
    let examples = "\nAvailable actions and their requirements:\n";
    for (const [action, info] of Object.entries(ACTION_EXAMPLES)) {
      examples += `\n- ${action}: ${info.description}\n  Example: ${JSON.stringify(info.example)}\n`;
    }
    return examples;
  }
  validateParams(action, prompt, url, style) {
    if (!action) {
      throw new Error(`"action" parameter is required.${this.getActionExamples()}`);
    }
    const allValidActions = [...ACTION_REQUIREMENTS.prompt, ...ACTION_REQUIREMENTS.url, ...ACTION_REQUIREMENTS.prompt_url, ...ACTION_REQUIREMENTS.style_url];
    if (!allValidActions.includes(action)) {
      throw new Error(`Invalid action: "${action}".${this.getActionExamples()}`);
    }
    if (ACTION_REQUIREMENTS.prompt.includes(action) && !prompt) {
      const example = JSON.stringify(ACTION_EXAMPLES[action]?.example || {});
      throw new Error(`"prompt" parameter is required for action "${action}". Example usage: ${example}`);
    }
    if (ACTION_REQUIREMENTS.url.includes(action) && !url) {
      const example = JSON.stringify(ACTION_EXAMPLES[action]?.example || {});
      throw new Error(`"url" parameter is required for action "${action}". Example usage: ${example}`);
    }
    if (ACTION_REQUIREMENTS.prompt_url.includes(action)) {
      if (!prompt) {
        const example = JSON.stringify(ACTION_EXAMPLES[action]?.example || {});
        throw new Error(`"prompt" parameter is required for action "${action}". Example usage: ${example}`);
      }
      if (!url) {
        const example = JSON.stringify(ACTION_EXAMPLES[action]?.example || {});
        throw new Error(`"url" parameter is required for action "${action}". Example usage: ${example}`);
      }
    }
    if (ACTION_REQUIREMENTS.style_url.includes(action)) {
      if (!style) {
        const example = JSON.stringify(ACTION_EXAMPLES[action]?.example || {});
        throw new Error(`"style" parameter is required for action "${action}". Example usage: ${example}`);
      }
      if (!url) {
        const example = JSON.stringify(ACTION_EXAMPLES[action]?.example || {});
        throw new Error(`"url" parameter is required for action "${action}". Example usage: ${example}`);
      }
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const aiGenerator = new AIImageGenerator();
  try {
    const imageBuffer = await aiGenerator.generate(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Error in API route:", error);
    const statusCode = error.message.includes("required") || error.message.includes("Invalid action") ? 400 : 500;
    res.status(statusCode).json({
      error: error.message
    });
  }
}