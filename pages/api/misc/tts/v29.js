import fetch from "node-fetch";
import https from "https";
import ApiKey from "@/configs/api-key";
class OpenAITTS {
  constructor({
    model = "tts-1",
    voice = "alloy"
  } = {}) {
    this.API_URL = "https://api.openai.com/v1/audio/speech";
    this.apiKey = ApiKey.openai?.[4];
    this.model = model;
    this.voice = voice;
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  }
  decode(str) {
    try {
      return JSON.parse(Buffer.from(str, "base64").toString());
    } catch {
      return Buffer.from(str, "base64").toString();
    }
  }
  async generate({
    text,
    voice = this.voice,
    model = this.model
  }) {
    if (!text?.trim()) {
      console.log("No text provided.");
      return null;
    }
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };
    const body = JSON.stringify({
      model: model,
      input: text.trim(),
      voice: voice
    });
    try {
      console.log(`[TTS] Generating: "${text.substring(0, 50)}..."`);
      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: headers,
        body: body,
        agent: this.httpsAgent
      });
      if (!response.ok) {
        const err = await response.text();
        console.log(`Error: ${err}`);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`Audio buffer generated: ${buffer.length} bytes`);
      return buffer;
    } catch (error) {
      console.log(`Error: ${error.message}`);
      return null;
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
  try {
    const api = new OpenAITTS();
    const result = await api.generate(params);
    res.setHeader("Content-Type", "audio/mp3");
    res.setHeader("Content-Disposition", 'inline; filename="generated_audio.mp3"');
    return res.status(200).send(result);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}