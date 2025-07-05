import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
class AidocmakerAPI {
  constructor() {
    this.baseUrl = "https://api-internal.aidocmaker.com";
    this.defaultHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async generateText(prompt, modelId = "gpt-4o-mini", clientUrl = "https://nextjs-docmaker.vercel.app/ai-text-generator") {
    const url = `${this.baseUrl}/generate_text`;
    const payload = {
      client_uuid: `client_uuid_${uuidv4()}`,
      client_url: clientUrl,
      prompt: prompt || "Provide a prompt for text generation.",
      model_id: modelId
    };
    try {
      const response = await axios.post(url, payload, {
        headers: this.defaultHeaders
      });
      return response.data;
    } catch (error) {
      console.error("Error generating text:", error.message);
      throw error;
    }
  }
  async createImage(prompt, isNew = true, clientUrl = "https://www.aidocmaker.com/text-to-image") {
    const url = `${this.baseUrl}/create_image?client_url=${encodeURIComponent(clientUrl)}`;
    const payload = {
      client_uuid: `client_uuid_${uuidv4()}`,
      client_url: clientUrl,
      prompt: prompt || "Provide a prompt for image generation.",
      is_new: isNew
    };
    try {
      const response = await axios.post(url, payload, {
        headers: {
          ...this.defaultHeaders,
          Accept: "application/json, text/plain, */*"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error creating image:", error.message);
      throw error;
    }
  }
  async createAudio(transcript, clientUrl = "https://www.aidocmaker.com/ai-voice-generator") {
    const url = `${this.baseUrl}/create_audio?client_url=${encodeURIComponent(clientUrl)}`;
    const payload = {
      client_uuid: `client_uuid_${uuidv4()}`,
      client_url: clientUrl,
      transcript: transcript || "Provide a transcript for audio generation."
    };
    try {
      const response = await axios.post(url, payload, {
        headers: {
          ...this.defaultHeaders,
          Accept: "application/json, text/plain, */*"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error creating audio:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    prompt,
    modelId,
    clientUrl,
    isNew,
    transcript
  } = req.method === "GET" ? req.query : req.body;
  const aidocmaker = new AidocmakerAPI();
  try {
    switch (action) {
      case "chat": {
        const response = await aidocmaker.generateText(prompt, modelId, clientUrl || "https://nextjs-docmaker.vercel.app/ai-text-generator");
        return res.status(200).json({
          success: true,
          data: response
        });
        break;
      }
      case "image": {
        const response = await aidocmaker.createImage(prompt, isNew === "true", clientUrl || "https://www.aidocmaker.com/text-to-image");
        return res.status(200).json({
          success: true,
          data: response
        });
        break;
      }
      case "audio": {
        const response = await aidocmaker.createAudio(transcript, clientUrl || "https://www.aidocmaker.com/ai-voice-generator");
        return res.status(200).json({
          success: true,
          data: response
        });
        break;
      }
      default: {
        res.status(400).json({
          success: false,
          message: "Invalid action"
        });
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}