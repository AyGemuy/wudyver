import axios from "axios";
const BASE_URL = "https://api.airforce";
class AirforceAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.availableModels = ["openchat-3.5-0106", "deepseek-coder-6.7b-base", "deepseek-coder-6.7b-instruct", "deepseek-math-7b-instruct", "Nous-Hermes-2-Mixtral-8x7B-DPO", "hermes-2-pro-mistral-7b", "openhermes-2.5-mistral-7b", "lfm-40b-moe", "discolm-german-7b-v1", "falcon-7b-instruct", "llama-2-7b-chat-int8", "llama-2-7b-chat-fp16", "neural-chat-7b-v3-1", "phi-2", "sqlcoder-7b-2", "tinyllama-1.1b-chat", "zephyr-7b-beta", "any-uncensored", "llama-3.1-70b-chat", "llama-3.1-8b-chat", "llama-3.1-70b-turbo", "llama-3.1-8b-turbo"];
  }
  async chatCompletions(model = "openchat-3.5-0106", messages, maxTokens = 2048, temperature = .7, topP = .5) {
    if (!this.availableModels.includes(model)) {
      throw new Error(`Model "${model}" is not available.`);
    }
    try {
      const response = await axios.post(`${BASE_URL}/v1/chat/completions`, {
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: topP,
        top_k: 0
      }, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error in chat completions: ${error.message}`);
    }
  }
  async generateImage(prompt, size = "1:1", seed = 123456, model = "flux", action = "imagine") {
    const validSizes = ["1:1", "16:9", "9:16", "21:9", "9:21", "1:2", "2:1"];
    const validModels = ["flux", "flux-realism", "flux-4o", "flux-pixel", "flux-3d", "flux-anime", "flux-disney", "any-dark", "stable-diffusion-xl-lightning", "stable-diffusion-xl-base"];
    if (!validSizes.includes(size) || !validModels.includes(model)) {
      throw new Error("Invalid size or model");
    }
    const endpoint = action === "imagine" ? "/v1/imagine" : "/imagine";
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        params: {
          prompt: prompt,
          size: size,
          seed: seed,
          model: model
        },
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error generating image: ${error.message}`);
    }
  }
  async getAudio(text, voice = "alex") {
    try {
      const response = await axios.get(`${BASE_URL}/get-audio`, {
        params: {
          text: text,
          voice: voice
        },
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error generating audio: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action = "Hello!",
      prompt,
      model,
      text,
      voice,
      size,
      seed,
      system,
      messages,
      apiKey
  } = req.method === "GET" ? req.query : req.body;
  const airforceAPI = new AirforceAPI(apiKey);
  try {
    let result;
    switch (action) {
      case "chat":
        if (!prompt) {
          return res.status(400).json({
            result: "Missing prompt or model for chat"
          });
        }
        const chatMessages = [{
          role: "system",
          content: system || "You are Hindia"
        }, {
          role: "user",
          content: prompt
        }];
        result = await airforceAPI.chatCompletions(model, req.method === "GET" ? chatMessages : messages);
        return res.status(200).json({
          result: result
        });
      case "imagine":
      case "imaginev2":
        if (!prompt) {
          return res.status(400).json({
            result: "Missing prompt or model for imagine"
          });
        }
        const imageBuffer = await airforceAPI.generateImage(prompt, size, seed, model, action);
        res.setHeader("Content-Type", "image/png");
        return res.status(200).send(imageBuffer);
      case "audio":
        if (!text) {
          return res.status(400).json({
            result: "Missing text or voice for audio"
          });
        }
        const audioBuffer = await airforceAPI.getAudio(text, voice);
        res.setHeader("Content-Type", "audio/mpeg");
        return res.status(200).send(audioBuffer);
      default:
        return res.status(400).json({
          result: "Invalid action"
        });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      result: error.message
    });
  }
}