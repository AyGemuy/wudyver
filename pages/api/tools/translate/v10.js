import axios from "axios";
class LaraTranslate {
  constructor() {
    this.api = {
      base: "https://webapi.laratranslate.com",
      endpoint: "/translate"
    };
    this.headers = {
      authority: "webapi.laratranslate.com",
      origin: "https://lara.com",
      referer: "https://lara.com/",
      "user-agent": "Postify/1.0.0"
    };
    this.instructions = {
      Faithful: [],
      Fluid: ["Translate this text with a focus on enhancing fluidity and readability. Prioritize natural language flow and coherence, ensuring the translation feels smooth and effortless while retaining the original meaning and intent."],
      Creative: ["Transform this text by infusing creativity, focusing on capturing the essence and emotion rather than a word-for-word translation. Use vivid imagery, dynamic expressions, and a playful tone to make the content engaging and imaginative while maintaining the original message's core themes."]
    };
  }
  async translate({
    text = "",
    to = "id",
    source = "",
    mode = "Faithful",
    customInstructions = []
  }) {
    if (!text || !to) {
      return {
        status: {
          success: false,
          code: 400,
          error: "Source text and to language are required."
        }
      };
    }
    const validModes = ["Faithful", "Fluid", "Creative", "Custom"];
    if (!validModes.includes(mode)) {
      return {
        status: {
          success: false,
          code: 400,
          error: `Invalid translation mode. Valid modes are: ${validModes.join(", ")}`
        }
      };
    }
    if (mode === "Custom" && (!Array.isArray(customInstructions) || customInstructions.length === 0)) {
      return {
        status: {
          success: false,
          code: 400,
          error: "Custom mode requires non-empty array of custom instructions."
        }
      };
    }
    try {
      const instructionsToSend = mode === "Custom" ? customInstructions : this.instructions[mode];
      const {
        data
      } = await axios.post(`${this.api.base}${this.api.endpoint}`, {
        q: text,
        source: source,
        target: to,
        instructions: instructionsToSend
      }, {
        headers: this.headers
      });
      if (data.status !== 200) {
        return {
          status: {
            success: false,
            code: data.status,
            error: data.message || `API error with status: ${data.status}`
          }
        };
      }
      const {
        source_language: sourceLang,
        translation,
        quota
      } = data.content;
      return {
        status: {
          success: true,
          code: 200
        },
        data: {
          mode: mode,
          originalText: text,
          sourceLang: sourceLang,
          targetLang: to,
          translation: translation,
          quota: quota
        }
      };
    } catch (error) {
      const statusCode = error.response?.status || 500;
      const errorMessage = axios.isAxiosError(error) ? error.response?.data?.message || error.message || "Network or API request failed." : error.message || "An unexpected error occurred.";
      return {
        status: {
          success: false,
          code: statusCode,
          error: errorMessage
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Text is required"
    });
  }
  const translator = new LaraTranslate();
  try {
    const data = await translator.translate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}