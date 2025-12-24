import axios from "axios";
class GeminiService {
  constructor(customKey = null) {
    this.config = {
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-2.0-flash-lite",
      endpoint: "/models/{model}:generateContent",
      generation: {
        temperature: .7,
        topP: .95,
        topK: 40,
        maxOutputTokens: 1024
      },
      retry: {
        maxAttempts: 3,
        delayMs: 1e3
      }
    };
    this.keys = ["QUl6YVN5Qy04V01Fd0V1NGcxWXB0M3BaaWw5NWswUEJrVUtWcjBz", "QUl6YVN5RGdDMVpwQnY3eXhMT3dLejBXYUhJM2NTaTlsUUJ2QXNZ", "QUl6YVN5RFJud01ZMU5GalZJSFhJU05sZnFBU040THIyckozVE9v", "QUl6YVN5REw5YTRDSm9icEQ4a0ttM1d3LXlBV0lvajZhbWgzMzA0", "QUl6YVN5Q29aZGRwSXk5TFU1Vm9uTUc1djYwRl8zaE5KeUpja3JR"];
    this.idx = 0;
    this.custKey = customKey;
    this.attempts = 0;
    this.log = {
      info: (msg, data = {}) => console.log(`[GeminiService INFO] ${new Date().toISOString()}: ${msg}`, data),
      error: (msg, error = null, data = {}) => {
        const errorDetails = error ? {
          message: error.message,
          stack: error.stack,
          response: error.response ? {
            status: error.response.status,
            data: error.response.data
          } : null
        } : {};
        console.error(`[GeminiService ERROR] ${new Date().toISOString()}: ${msg}`, {
          error: errorDetails,
          data: data
        });
      },
      debug: (msg, data = {}) => console.log(`[GeminiService DEBUG] ${new Date().toISOString()}: ${msg}`, data)
    };
  }
  getActiveKey() {
    try {
      const keyIndex = this.custKey ? null : this.idx % this.keys.length;
      const encodedKey = this.custKey || this.keys[keyIndex];
      if (!encodedKey) throw new Error("No available API keys");
      const decodedKey = Buffer.from(encodedKey, "base64").toString("utf-8");
      this.log.debug("Active key retrieved", {
        index: keyIndex,
        hasCustomKey: !!this.custKey
      });
      if (!this.custKey && keyIndex !== null) {
        this.idx = (this.idx + 1) % this.keys.length;
      }
      return decodedKey;
    } catch (error) {
      this.log.error("Failed to get active key", error);
      throw new Error("API key initialization failed");
    }
  }
  buildUrl() {
    const url = this.config.endpoint.replace("{model}", this.config.model);
    return `${this.config.baseUrl}${url}`;
  }
  async withRetry(operation, maxAttempts = this.config.retry.maxAttempts) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.attempts = attempt;
        this.log.debug(`Attempt ${attempt}/${maxAttempts}`);
        return await operation();
      } catch (error) {
        this.log.error(`Attempt ${attempt} failed`, error, {
          maxAttempts: maxAttempts
        });
        const shouldRetry = this.shouldRetry(error, attempt, maxAttempts);
        if (!shouldRetry) throw error;
        if (attempt < maxAttempts) {
          await this.delay(this.config.retry.delayMs * attempt);
        }
      }
    }
    throw new Error("All retry attempts failed");
  }
  shouldRetry(error, attempt, maxAttempts) {
    const status = error?.response?.status;
    const errorCode = error?.response?.data?.error?.code;
    const retryable = status === 400 && errorCode === "invalid_api_key" || status >= 500 || attempt < maxAttempts;
    if (retryable && errorCode === "invalid_api_key") {
      this.rotateKey();
    }
    return retryable;
  }
  rotateKey() {
    if (!this.custKey) {
      this.idx = (this.idx + 1) % this.keys.length;
      this.log.info("Rotated to next API key", {
        newIndex: this.idx
      });
    }
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async generate({
    mode = "basic",
    sugFlds = false,
    ...params
  } = {}) {
    try {
      return await this.withRetry(async () => {
        this.log.info("Starting generate", {
          mode: mode,
          sugFlds: sugFlds,
          params: params
        });
        const key = this.getActiveKey();
        const url = `${this.buildUrl()}?key=${key}`;
        let finalParams = params;
        if (sugFlds) {
          this.log.info("Step 1: Generating fields automatically");
          const autoFields = await this.generateFieldsInternal();
          finalParams = {
            ...autoFields,
            ...params
          };
          this.log.info("Step 1 complete", {
            fields: Object.keys(finalParams)
          });
        }
        const generationConfig = this.getGenerationConfig(mode);
        const contents = this.buildContents(mode, finalParams);
        this.log.debug("Step 2: Sending request", {
          url: url.substring(0, 50) + "...",
          contentsLength: contents.length,
          sugFlds: sugFlds,
          subject: finalParams.subject
        });
        const response = await axios.post(url, {
          contents: contents,
          generationConfig: generationConfig
        });
        const text = this.extractText(response.data);
        this.log.info("Generation successful", {
          mode: mode,
          sugFlds: sugFlds,
          length: text.length
        });
        return {
          result: text,
          error: null
        };
      });
    } catch (error) {
      this.log.error("Generate method failed after all retries", error, {
        mode: mode,
        sugFlds: sugFlds,
        params: params
      });
      return {
        result: null,
        error: error.message || "Generation failed"
      };
    }
  }
  async generateFieldsInternal() {
    try {
      const key = this.getActiveKey();
      const url = `${this.buildUrl()}?key=${key}`;
      const contents = this.buildSuggestContents();
      const response = await axios.post(url, {
        contents: contents,
        generationConfig: {
          ...this.config.generation,
          temperature: .8
        }
      });
      const json = this.processSuggestResponse(response.data);
      return json;
    } catch (error) {
      this.log.error("Failed to generate fields internally", error);
      throw new Error("Field generation failed");
    }
  }
  getGenerationConfig(mode) {
    const baseConfig = {
      ...this.config.generation
    };
    return mode === "suggest" ? {
      ...baseConfig,
      temperature: .8
    } : baseConfig;
  }
  buildContents(mode, params) {
    const systemPrompt = this.getSystemPrompt(mode);
    const userPrompt = this.createUserPrompt(params, mode);
    return [{
      role: "model",
      parts: [{
        text: systemPrompt
      }]
    }, {
      role: "user",
      parts: [{
        text: userPrompt
      }]
    }];
  }
  buildSuggestContents() {
    const system = "You are a creative assistant specializing in video content creation. Return valid JSON only. No explanations, no markdown formatting, no code blocks.";
    const user = `Generate creative suggestions for a video prompt with these exact field names as JSON keys:
"subject", "action", "expression", "place", "time", "camera_movement", "lighting", "video_style", "video_atmosphere", "sound_music", "spoken_sentences", "additional_details"

For time, use one of: "Dawn", "Morning", "Noon", "Afternoon", "Sunset", "Dusk", "Night", "Midnight"
For camera_movement, use one of: "Static Shot", "Panning Shot", "Tracking Shot", "Dolly Zoom", "Aerial Shot", "Dutch Angle", "POV Shot", "Close-Up", "Extreme Close-Up", "Wide Shot", "Establishing Shot"

STRICT RESPONSE FORMAT: Return ONLY a valid JSON object. No explanations, no markdown, no code blocks like \`\`\`json.`;
    return [{
      role: "model",
      parts: [{
        text: system
      }]
    }, {
      role: "user",
      parts: [{
        text: user
      }]
    }];
  }
  getSystemPrompt(mode) {
    const prompts = {
      advanced: `You are a professional video creator specializing in creating detailed, creative prompts for video generation. 
Your task is to craft a high-quality, detailed prompt based on the information provided.
The prompt should be highly descriptive, creative, and specific to help generate the best possible video content.

Guidelines:
- Create a cinematic, detailed description
- Include visual elements, camera angles, and atmosphere
- Blend all elements into a cohesive, flowing prompt
- Use rich, descriptive language
- No bullet points or separate sections in your response
- Respond with ONLY the finished prompt text, no additional commentary`,
      automatic: `You are a professional prompt engineer specializing in creating detailed, creative video prompts.
Based on the category provided, create 1-3 detailed prompt variations that match the style and intent.

Guidelines:
- Generate 1-3 detailed, ready-to-use prompts
- Each prompt should be highly descriptive and visual
- Include specific details about subject, action, environment, lighting, camera movement
- Format as numbered prompts separated by line breaks
- Make each prompt different but related to the same concept
- Respond with ONLY the finished prompts, no additional commentary`,
      basic: "You are a creative assistant helping to generate video prompts."
    };
    return prompts[mode] || prompts.basic;
  }
  createUserPrompt(params, mode) {
    const builders = {
      advanced: this.buildAdvancedPrompt,
      automatic: this.buildAutomaticPrompt,
      basic: this.buildBasicPrompt
    };
    const builder = builders[mode] || builders.basic;
    return builder.call(this, params);
  }
  buildAdvancedPrompt(params) {
    const {
      category = "video",
        subject = "",
        action = "",
        expression = "",
        place = "",
        time = "",
        camera_movement = "",
        lighting = "",
        video_style = "",
        video_atmosphere = "",
        sound_music = "",
        spoken_sentences = "",
        additional_details = ""
    } = params;
    return `Please create a detailed prompt for a ${category} style video with the following elements:
- Subject: ${subject}
- Action: ${action}
- Expression: ${expression}
- Place: ${place}
- Time: ${time}
- Camera Movement: ${camera_movement}
- Lighting: ${lighting}
- Video Style: ${video_style}
- Atmosphere: ${video_atmosphere}
- Sound/Music: ${sound_music}
- Spoken Sentences: ${spoken_sentences}
- Additional Details: ${additional_details}

Create a flowing, natural-sounding prompt that incorporates all these elements.`;
  }
  buildAutomaticPrompt(params) {
    const {
      category = "",
        topic = "",
        subcategory = "",
        style = ""
    } = params;
    return `Generate ${category} style video prompts about "${topic}" with ${subcategory} elements in ${style} style.
Make the prompts highly detailed, creative and ready to use for video creation.`;
  }
  buildBasicPrompt(params) {
    return `Generate a creative video prompt with the following details: ${JSON.stringify(params) || ""}`;
  }
  extractText(data) {
    try {
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate prompt. Please try again.";
    } catch (error) {
      this.log.error("Failed to extract text from response data", error, {
        data: data
      });
      return "Unable to generate prompt. Please try again.";
    }
  }
  processSuggestResponse(data) {
    let text = this.extractText(data);
    text = this.cleanJsonResponse(text);
    try {
      const json = JSON.parse(text);
      return this.normalizeFields(json);
    } catch (error) {
      this.log.error("JSON parse failed, using fallback", error, {
        text: text
      });
      return this.extractKeyValue(text);
    }
  }
  cleanJsonResponse(text) {
    return text.replace(/```(?:json)?\s*|\s*```/g, "").trim();
  }
  normalizeFields(json) {
    return {
      ...json,
      time: this.normalizeTime(json?.time),
      camera_movement: this.normalizeCamera(json?.camera_movement)
    };
  }
  normalizeTime(value) {
    const times = ["Dawn", "Morning", "Noon", "Afternoon", "Sunset", "Dusk", "Night", "Midnight"];
    const normalized = value?.trim()?.toLowerCase() || "";
    return times.find(t => normalized.includes(t.toLowerCase())) ?? "Sunset";
  }
  normalizeCamera(value) {
    const movements = ["Static Shot", "Panning Shot", "Tracking Shot", "Dolly Zoom", "Aerial Shot", "Dutch Angle", "POV Shot", "Close-Up", "Extreme Close-Up", "Wide Shot", "Establishing Shot"];
    const normalized = value?.trim()?.toLowerCase() || "";
    return movements.find(m => normalized.includes(m.toLowerCase())) ?? "Wide Shot";
  }
  extractKeyValue(text) {
    this.log.debug("Manual extraction from", {
      textLength: text.length
    });
    const map = {};
    const fields = ["subject", "action", "expression", "place", "time", "camera_movement", "lighting", "video_style", "video_atmosphere", "sound_music", "spoken_sentences", "additional_details"];
    const jsonRegex = /"([^"]+)"\s*:\s*"([^"]+)"/g;
    let match;
    while ((match = jsonRegex.exec(text)) !== null) {
      const key = match[1]?.trim();
      const value = match[2]?.trim();
      if (fields.includes(key)) map[key] = value;
    }
    if (Object.keys(map).length < fields.length) {
      const lines = text.split(/\n/);
      for (const line of lines) {
        if (line.includes(":")) {
          const [key, value] = line.split(":").map(s => s?.trim()?.replace(/["']/g, "") || "");
          if (fields.includes(key)) map[key] = value;
        }
      }
    }
    return {
      ...map,
      time: this.normalizeTime(map?.time),
      camera_movement: this.normalizeCamera(map?.camera_movement)
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const api = new GeminiService();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[Handler ERROR] ${new Date().toISOString()}: Failed to process request`, {
      error: error.message,
      stack: error.stack,
      params: params
    });
    res.status(500).json({
      result: null,
      error: error.message || "Internal Server Error"
    });
  }
}