import axios from "axios";
class StoryGenerator {
  constructor(config = {}) {
    this.config = {
      apiKey: config?.apiKey || "1234Test",
      baseUrl: config?.baseUrl || "https://responsedh.mycdnpro.com",
      endpoint: "/api/Text/Generate",
      timeout: config?.timeout || 3e4,
      client: config?.client || "StoryApp",
      ...config
    };
    console.log("StoryGenerator initialized");
  }
  async gen({
    type = "quick",
    text,
    client = this.config.client,
    mode = "Any genre",
    length = "Short",
    creative = "Medium",
    language = null,
    syllable = null,
    ...rest
  } = {}) {
    try {
      console.log(`Generating story with type: ${type}`);
      if (!text) {
        return {
          success: false,
          result: null,
          error: "Text parameter is required"
        };
      }
      const validTypes = ["quick", "advanced", "text"];
      if (!validTypes.includes(type)) {
        return {
          success: false,
          result: null,
          error: `Invalid type. Must be one of: ${validTypes.join(", ")}`
        };
      }
      let apiResult;
      switch (type) {
        case "quick":
          apiResult = await this.quickGen({
            text: text,
            client: client,
            ...rest
          });
          break;
        case "advanced":
          apiResult = await this.advancedGen({
            text: text,
            client: client,
            mode: mode,
            length: length,
            creative: creative,
            language: language,
            syllable: syllable,
            ...rest
          });
          break;
        case "text":
          apiResult = await this.genText({
            text: text,
            client: client,
            ...rest
          });
          break;
        default:
          apiResult = await this.quickGen({
            text: text,
            client: client,
            ...rest
          });
      }
      if (apiResult && typeof apiResult === "object" && "success" in apiResult) {
        return apiResult;
      }
      return {
        success: true,
        result: apiResult
      };
    } catch (error) {
      console.error(`Story generation failed for type ${type}:`, error?.message);
      return {
        success: false,
        result: null,
        error: error?.message
      };
    }
  }
  async quickGen({
    text,
    client = this.config.client,
    ...rest
  } = {}) {
    try {
      console.log("Quick story generation...");
      if (!text) {
        return {
          success: false,
          result: null,
          error: "Text parameter is required for quick generation"
        };
      }
      const requestBody = {
        text: text,
        client: client,
        toolName: "_storygenerator",
        mode: "Any genre",
        length: "Short",
        creative: "Medium",
        language: null,
        syllable: null,
        ...rest
      };
      const response = await axios.post(`${this.config.baseUrl}${this.config.endpoint}`, requestBody, {
        headers: {
          "User-Agent": rest?.userAgent || "Dart/3.8 (dart:io)",
          "Content-Type": "application/json",
          "dhp-api-key": this.config.apiKey,
          ...rest?.headers
        },
        timeout: rest?.timeout || this.config.timeout
      });
      const data = response?.data;
      if (!data?.isSuccess) {
        const errorMsg = data?.errorMessages?.join(", ") || "Unknown API error";
        return {
          success: false,
          result: null,
          error: `API error: ${errorMsg}`
        };
      }
      console.log("Quick story generation successful");
      return {
        success: true,
        result: data?.response
      };
    } catch (error) {
      console.error("Quick generation failed:", error?.response?.data || error?.message);
      return {
        success: false,
        result: null,
        error: error?.message
      };
    }
  }
  async advancedGen({
    text,
    client = this.config.client,
    mode = "Any genre",
    length = "Short",
    creative = "Medium",
    language = null,
    syllable = null,
    ...rest
  } = {}) {
    try {
      console.log("Advanced story generation...");
      if (!text) {
        return {
          success: false,
          result: null,
          error: "Text parameter is required"
        };
      }
      const validModes = ["Any genre", "Action", "Sci-fi", "Mystery", "Biography", "Young Adult", "Crime", "Horror", "Thriller", "Children Books", "Non-fiction", "Humor", "Historical Fiction"];
      const validLengths = ["Short", "Novel"];
      const validCreative = ["Medium", "High"];
      if (!validModes.includes(mode)) {
        return {
          success: false,
          result: null,
          error: `Invalid mode. Must be one of: ${validModes.join(", ")}`
        };
      }
      if (!validLengths.includes(length)) {
        return {
          success: false,
          result: null,
          error: `Invalid length. Must be one of: ${validLengths.join(", ")}`
        };
      }
      if (!validCreative.includes(creative)) {
        return {
          success: false,
          result: null,
          error: `Invalid creative level. Must be one of: ${validCreative.join(", ")}`
        };
      }
      const requestBody = {
        text: text,
        client: client,
        toolName: "_storygenerator",
        mode: mode,
        length: length,
        language: language,
        syllable: syllable,
        creative: creative,
        ...rest
      };
      console.log("Sending advanced story request...");
      const response = await axios.post(`${this.config.baseUrl}${this.config.endpoint}`, requestBody, {
        headers: {
          "User-Agent": rest?.userAgent || "Dart/3.8 (dart:io)",
          "Content-Type": "application/json",
          "dhp-api-key": this.config.apiKey,
          ...rest?.headers
        },
        timeout: rest?.timeout || this.config.timeout
      });
      const data = response?.data;
      if (!data?.isSuccess) {
        const errorMsg = data?.errorMessages?.join(", ") || "Unknown API error";
        return {
          success: false,
          result: null,
          error: `API error: ${errorMsg}`
        };
      }
      console.log("Advanced story generation successful");
      return {
        success: true,
        result: data?.response
      };
    } catch (error) {
      console.error("Advanced generation failed:", error?.response?.data || error?.message);
      return {
        success: false,
        result: null,
        error: error?.message
      };
    }
  }
  async genText({
    text,
    client = this.config.client,
    ...rest
  } = {}) {
    try {
      console.log("Extracting story text...");
      const response = await this.quickGen({
        text: text,
        client: client,
        ...rest
      });
      if (!response.success) {
        return {
          success: false,
          result: null,
          error: response.error
        };
      }
      const storyText = response.result;
      if (!storyText) {
        return {
          success: false,
          result: null,
          error: "No story text found in response"
        };
      }
      console.log("Text extraction successful");
      return {
        success: true,
        result: storyText
      };
    } catch (error) {
      console.error("Text extraction failed:", error?.message);
      return {
        success: false,
        result: null,
        error: error?.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Text are required"
    });
  }
  try {
    const api = new StoryGenerator();
    const response = await api.gen(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}