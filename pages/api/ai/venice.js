import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import SpoofHead from "@/lib/spoof-head";
class VeniceAI {
  constructor() {
    this.client = axios.create({
      baseURL: "https://outerface.venice.ai/api",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        priority: "u=1, i",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        origin: "https://venice.ai",
        referer: "https://venice.ai/",
        ...SpoofHead()
      }
    });
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    this.version = null;
    this.middlefaceVersion = "0.1.197";
    this.userId = `user_anon_${Math.random().toString().slice(2, 12)}`;
    this.cookies = {};
    this.setupInterceptors();
  }
  setupInterceptors() {
    this.client.interceptors.request.use(config => {
      config.headers["x-venice-timestamp"] = new Date().toISOString();
      if (this.version) {
        config.headers["x-venice-version"] = this.version;
      }
      config.headers["x-venice-middleface-version"] = this.middlefaceVersion;
      config.headers["x-venice-request-timestamp-ms"] = new Date().getTime();
      if (Object.keys(this.cookies).length > 0) {
        const cookieString = Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
        config.headers["Cookie"] = cookieString;
      }
      return config;
    });
    this.client.interceptors.response.use(response => {
      const setCookie = response.headers["set-cookie"];
      if (setCookie) {
        setCookie.forEach(cookie => {
          const [cookieStr] = cookie.split(";");
          const [key, value] = cookieStr.split("=");
          this.cookies[key] = value;
        });
      }
      return response;
    }, error => {
      return Promise.reject(error);
    });
  }
  async getVersion() {
    try {
      const url = `https://venice.ai/api/venice/version?${new Date().valueOf()}`;
      const response = await axios.get(url, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          priority: "u=1, i",
          referer: "https://venice.ai/chat",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          ...SpoofHead()
        }
      });
      this.version = response.data.version;
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get version: ${error.message}`);
    }
  }
  async imageToBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const base64 = Buffer.from(response.data, "binary").toString("base64");
      return base64;
    } catch (error) {
      throw new Error(`Failed to convert image to base64: ${error.message}`);
    }
  }
  async uploadImage(buffer, mimeType = "image/png", fileName = "image.png") {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mimeType
      }), fileName);
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers ? formData.headers : {}
        }
      });
      if (!uploadResponse) {
        throw new Error("Upload failed");
      }
      return uploadResponse?.result;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error uploading image: Server responded with status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("Error uploading image: No response received from server.");
      } else {
        throw new Error("Error uploading image: " + error.message);
      }
    }
  }
  async chat({
    prompt,
    imageUrl,
    messages = [],
    ...rest
  }) {
    try {
      if (!this.version) {
        await this.getVersion();
      }
      let promptArray = [];
      if (messages.length > 0) {
        promptArray = messages;
      } else {
        promptArray = [{
          content: prompt,
          role: "user"
        }];
      }
      if (imageUrl) {
        const base64Image = await this.imageToBase64(imageUrl);
        const lastPrompt = promptArray[promptArray.length - 1];
        lastPrompt.imagePath = [base64Image];
      }
      const data = {
        characterId: "",
        clientProcessingTime: 4848,
        conversationType: "text",
        includeVeniceSystemPrompt: true,
        isCharacter: false,
        modelId: "mistral-31-24b",
        prompt: promptArray,
        reasoning: true,
        requestId: this.generateRequestId(),
        systemPrompt: "",
        temperature: .7,
        topP: .9,
        userId: this.userId,
        webEnabled: true,
        ...rest
      };
      const response = await this.client.post("/inference/chat", data, {
        headers: {
          "content-type": "application/json"
        }
      });
      const lines = response.data.split("\n").filter(line => line.trim());
      const result = {
        result: "",
        kind: []
      };
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.kind === "content") {
            result.result += parsed.content;
            result.kind.push(parsed);
          }
        } catch (e) {}
      }
      return result;
    } catch (error) {
      throw new Error(`Chat failed: ${error.message}`);
    }
  }
  async image({
    prompt,
    ...rest
  }) {
    try {
      if (!this.version) {
        await this.getVersion();
      }
      const data = {
        aspectRatio: "2:3",
        embedExifMetadata: true,
        format: "png",
        height: 1264,
        hideWatermark: false,
        imageToImageCfgScale: 15,
        imageToImageStrength: 33,
        loraStrength: 75,
        matureFilter: true,
        messageId: this.generateMessageId(),
        modelId: "hidream",
        negativePrompt: "",
        parentMessageId: null,
        prompt: prompt,
        requestId: this.generateRequestId(),
        seed: Math.floor(Math.random() * 1e8),
        steps: 20,
        stylePreset: "Cinematic",
        type: "image",
        userId: this.userId,
        variants: 1,
        width: 848,
        ...rest
      };
      const response = await this.client.post("/inference/image", data, {
        headers: {
          "content-type": "application/json"
        },
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      return {
        result: await this.uploadImage(buffer)
      };
    } catch (error) {
      throw new Error(`Image generation failed: ${error.message}`);
    }
  }
  async prompt_enhance({
    prompt
  }) {
    try {
      if (!this.version) {
        await this.getVersion();
      }
      const data = {
        prompt: prompt
      };
      const response = await this.client.post("/inference/image_prompt_enhance_streaming", data, {
        headers: {
          accept: "text/event-stream",
          "content-type": "application/json"
        }
      });
      const lines = response.data.split("\n").filter(line => line.trim());
      const result = {
        result: "",
        text: []
      };
      for (const line of lines) {
        try {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            const parsed = JSON.parse(jsonStr);
            if (parsed.text) {
              result.result += parsed.text;
              result.text.push(parsed);
            } else if (parsed.results && parsed.results.enhancedPrompt) {
              result.result = parsed.results.enhancedPrompt;
            }
          }
        } catch (e) {}
      }
      return result;
    } catch (error) {
      throw new Error(`Prompt enhance failed: ${error.message}`);
    }
  }
  generateRequestId() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  generateMessageId() {
    return Math.random().toString(36).substring(2, 10);
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
        action: "chat | image | prompt_enhance"
      }
    });
  }
  const venice = new VeniceAI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt && !params.messages) {
          return res.status(400).json({
            error: `Missing required field: prompt or messages (required for ${action})`
          });
        }
        result = await venice.chat(params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await venice.image(params);
        break;
      case "prompt_enhance":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await venice.prompt_enhance(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | image | prompt_enhance`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("VeniceAI API Error:", error);
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}