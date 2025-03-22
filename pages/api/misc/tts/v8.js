import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
import fetch from "node-fetch";
import crypto from "crypto";
class VoiceAPI {
  async createVoice(voiceId, url) {
    try {
      const inputBuffer = await fetch(url).then(res => res.arrayBuffer());
      const {
        ext,
        mime
      } = await fileTypeFromBuffer(Buffer.from(inputBuffer)) || {};
      const randomBytes = crypto.randomBytes(5).toString("hex");
      const formdata = new FormData();
      formdata.append("soundFile", new Blob([inputBuffer], {
        type: mime
      }), `${randomBytes}.${ext}`);
      formdata.append("voiceModelId", voiceId || "221129");
      const response = await fetch("https://relikt-sweng465.vercel.app/api/voice/create_vtv", {
        method: "POST",
        body: formdata
      });
      return await response.json();
    } catch (error) {
      console.error("Error in createVoice:", error);
      throw error;
    }
  }
  async getModelData(type) {
    let voices = [];
    try {
      if (type === "eleven") {
        const response = await fetch("https://api.elevenlabs.io/v1/voices");
        voices = (await response.json()).voices;
        return voices.map(voice => ({
          label: voice.name,
          value: voice.voice_id
        })).sort((a, b) => a.label.localeCompare(b.label));
      } else if (type === "kits") {
        const response = await fetch("https://relikt-sweng465.vercel.app/api/voice/get_vtv_models");
        voices = (await response.json()).data;
        return voices.map(voice => ({
          label: voice.title,
          value: voice.id
        })).sort((a, b) => a.label.localeCompare(b.label));
      }
    } catch (error) {
      console.error("Error in getModelData:", error);
      throw error;
    }
  }
  async createTTS(voiceId, text) {
    try {
      const response = await fetch("https://relikt-sweng465.vercel.app/api/voice/create_tts", {
        method: "POST",
        body: new URLSearchParams({
          textToConvert: text || "Hello",
          voiceId: voiceId || "CYw3kZ02Hs0563khs1Fj"
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error in createTTS:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  if (req.method === "GET") {
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
      if (action === "voice" && voiceId && url) {
        result = await voiceAPI.createVoice(voiceId, url);
      } else if (action === "model" && type) {
        result = await voiceAPI.getModelData(type);
      } else if (action === "tts" && voiceId && text) {
        result = await voiceAPI.createTTS(voiceId, text);
      } else {
        return res.status(400).json({
          error: "Invalid or missing query parameters"
        });
      }
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error handling request:", error);
      return res.status(500).json({
        error: "Internal Server Error"
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}