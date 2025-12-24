import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class EarkickClient {
  constructor() {
    this.baseURL = "https://ml-demo.earkick.com/web-chat";
    this._appId = null;
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        Connection: "keep-alive",
        Origin: "https://chat.earkick.com",
        Referer: "https://chat.earkick.com/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    });
  }
  _generateAppId() {
    return crypto.randomUUID().toUpperCase();
  }
  async ensureInitialized(options = {}) {
    if (!this._appId) {
      console.log("AppId not set. Initializing chat to get one...");
      const initData = await this.initializeChat(options);
      this._appId = initData.app_id;
    }
  }
  async initializeChat({
    appId,
    persona_id,
    user_name
  } = {}) {
    const url = "/audio/initialize_chat";
    const data = {
      app_id: appId || this._generateAppId(),
      chat_style: persona_id || "default_panda"
    };
    if (user_name) {
      data.user_name = user_name;
    }
    try {
      console.log("Initializing chat...");
      const response = await this.axios.post(url, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa("webchat:awCipmikIbuphArnEkBabMysUdsodutjahurEec:")
        }
      });
      this._appId = response.data.app_id;
      console.log(`Chat initialized. App ID: ${this._appId}`);
      return response.data;
    } catch (error) {
      console.error("Error initializing chat:", error.response?.data || error.message);
      throw new Error("Failed to initialize chat.");
    }
  }
  async uploadAudio({
    audioUrl,
    messages,
    language,
    voice
  }) {
    await this.ensureInitialized();
    const uploadAuthorization = "Basic " + btoa("demo:EarkickIsJustAmazing");
    try {
      console.log(`Downloading audio from: ${audioUrl}...`);
      const audioResponse = await axios.get(audioUrl, {
        responseType: "arraybuffer"
      });
      const audioBuffer = Buffer.from(audioResponse.data);
      const formData = new FormData();
      formData.append("app_id", this._appId);
      formData.append("language", language);
      formData.append("tts_voice", voice);
      formData.append("audio", audioBuffer, {
        filename: "audio.wav",
        contentType: "audio/wav"
      });
      const serializedMessages = JSON.stringify(messages.map(m => ({
        role: m.role,
        content: m.content
      })));
      formData.append("messages", serializedMessages);
      console.log("Uploading audio to Earkick...");
      const response = await this.axios.post("/audio/audio_generate", formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: uploadAuthorization
        }
      });
      console.log("Upload successful.");
      return response.data;
    } catch (error) {
      console.error("Error during audio upload:", error.response?.data || error.message);
      throw new Error("Failed to upload audio.");
    }
  }
  async chat({
    prompt,
    messages = [],
    language = "id",
    voice = false,
    persona_id = "default_panda",
    audio_url = null,
    ...rest
  }) {
    await this.ensureInitialized({
      persona_id: persona_id
    });
    if (audio_url) {
      console.log("Audio URL terdeteksi, mengunggah audio...");
      return this.uploadAudio({
        audioUrl: audio_url,
        messages: messages,
        language: language,
        voice: voice
      });
    }
    const payloadMessages = messages && messages.length > 0 ? messages : [{
      role: "user",
      content: prompt
    }];
    const url = "/audio/audio_generate";
    const formData = new FormData();
    const serializedMessages = JSON.stringify(payloadMessages.map(m => ({
      role: m.role,
      content: m.content
    })));
    formData.append("app_id", this._appId);
    formData.append("language", language || "id");
    if (voice && voice !== "false") {
      formData.append("tts_voice", voice);
      formData.append("voice", "true");
    } else {
      formData.append("voice", "false");
    }
    if (persona_id) {
      formData.append("chat_style", persona_id);
    }
    formData.append("messages", serializedMessages);
    try {
      console.log("Sending chat message...");
      const response = await this.axios.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: "Basic " + btoa("webchat:awCipmikIbuphArnEkBabMysUdsodutjahurEec:")
        }
      });
      console.log("Chat response received.");
      return response.data;
    } catch (error) {
      console.error("Error in chat interaction:", error.response?.data || error.message);
      throw new Error("Failed to get chat response.");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const client = new EarkickClient();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}