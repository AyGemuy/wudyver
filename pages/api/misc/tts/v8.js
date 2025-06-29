import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
import crypto from "crypto";
class VoiceAPI {
  async createVoice(voiceId, url) {
    try {
      const {
        data: inputBuffer
      } = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const {
        ext,
        mime
      } = await fileTypeFromBuffer(Buffer.from(inputBuffer)) || {};
      const randomName = crypto.randomBytes(5).toString("hex");
      const form = new FormData();
      form.append("soundFile", new Blob([inputBuffer], {
        type: mime
      }), `${randomName}.${ext}`);
      form.append("voiceModelId", voiceId || "221129");
      const response = await axios.post("https://relikt-sweng465.vercel.app/api/voice/create_vtv", form, {
        headers: form.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error in createVoice:", error.message);
      throw error;
    }
  }
  async getModelData(type) {
    try {
      switch (type) {
        case "eleven": {
          const {
            data
          } = await axios.get("https://api.elevenlabs.io/v1/voices");
          return data.voices.map(v => ({
            label: v.name,
            value: v.voice_id
          })).sort((a, b) => a.label.localeCompare(b.label));
        }
        case "kits": {
          const {
            data
          } = await axios.get("https://relikt-sweng465.vercel.app/api/voice/get_vtv_models");
          return data.data.map(v => ({
            label: v.title,
            value: v.id
          })).sort((a, b) => a.label.localeCompare(b.label));
        }
        default:
          throw new Error("Unsupported type");
      }
    } catch (error) {
      console.error("Error in getModelData:", error.message);
      throw error;
    }
  }
  async createTTS(voiceId, text) {
    try {
      const form = new URLSearchParams({
        textToConvert: text || "Hello",
        voiceId: voiceId || "CYw3kZ02Hs0563khs1Fj"
      });
      const {
        data
      } = await axios.post("https://relikt-sweng465.vercel.app/api/voice/create_tts", form.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      return data;
    } catch (error) {
      console.error("Error in createTTS:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    url,
    type,
    id: voiceId,
    text
  } = req.method === "GET" ? req.query : req.body;
  const voiceAPI = new VoiceAPI();
  try {
    let result;
    switch (action) {
      case "voice":
        if (!voiceId || !url) return res.status(400).json({
          error: "Missing voiceId or url"
        });
        result = await voiceAPI.createVoice(voiceId, url);
        break;
      case "model":
        if (!type) return res.status(400).json({
          error: "Missing model type"
        });
        result = await voiceAPI.getModelData(type);
        break;
      case "tts":
        if (!voiceId || !text) return res.status(400).json({
          error: "Missing voiceId or text"
        });
        result = await voiceAPI.createTTS(voiceId, text);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}