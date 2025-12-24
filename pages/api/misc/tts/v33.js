import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import crypto from "crypto";
import WebSocket from "ws";
class VoiceRankings {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.baseUrl = "https://www.voicerankings.com/api/v1/voice";
    this.wsUrl = "wss://ws.summ.me/";
    this.defaultVoiceId = "b373f0a4-d5c0-44eb-a048-e58f47be238f";
    this.defaultSpeakerId = "Leda--xh723";
    this.defaultService = "gemini-2-5-flash-tts";
  }
  getUuid() {
    return crypto.randomUUID();
  }
  getHeaders(refUuid = null) {
    return {
      accept: "application/json, */*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://www.voicerankings.com",
      referer: `https://www.voicerankings.com/voice/gemini-2-5-flash-tts/female/Leda--xh723?snippet=${refUuid || this.getUuid()}`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async search({
    query,
    ...rest
  }) {
    if (!query) throw new Error("Parameter 'query' is required.");
    try {
      const params = new URLSearchParams({
        search: query,
        ...rest
      });
      const response = await this.client.get(`${this.baseUrl}/search?${params.toString()}`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error("[Search Error]", error?.message);
      return {
        voices: []
      };
    }
  }
  async generate({
    text,
    ...rest
  }) {
    const jobId = this.getUuid();
    const snippetId = this.getUuid();
    const targetText = text || "Hello World";
    const serviceName = rest.service || this.defaultService;
    const voiceId = rest.voice || this.defaultVoiceId;
    const speakerId = rest.speaker || this.defaultSpeakerId;
    const gender = rest.gender || "female";
    console.log(`[Init] Job: ${jobId} | Connecting to WebSocket...`);
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl, {
        headers: {
          Origin: "https://www.voicerankings.com",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "Accept-Language": "id-ID",
          Pragma: "no-cache",
          "Cache-Control": "no-cache"
        }
      });
      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error("Timeout waiting for audio generation"));
      }, 3e4);
      ws.on("open", () => {
        console.log("[WS] Connected.");
      });
      ws.on("error", err => {
        clearTimeout(timeout);
        reject(err);
      });
      ws.on("message", async data => {
        try {
          const message = JSON.parse(data.toString());
          if (message.action === "Your Connection ID") {
            const connectionId = message.connectionId;
            console.log(`[WS] Received Connection ID: ${connectionId}`);
            console.log(`[Http] Sending generation request...`);
            const payload = {
              action: "start",
              jobId: jobId,
              connectionId: connectionId,
              text: targetText,
              serviceName: serviceName,
              voice_id: voiceId,
              voice_instructions: rest.instructions || "",
              gender: gender,
              speaker_id: speakerId,
              languageCode: rest.languageCode || "en-US",
              voice_speed: rest.speed || 1,
              voice_snippet_shared: true,
              includeAudioTimestamps: true,
              createSnippet: true,
              directory: "snippets",
              fileName: `snippet-${snippetId}.mp3`
            };
            try {
              const postResponse = await this.client.post(`${this.baseUrl}/speech`, payload, {
                headers: this.getHeaders(snippetId)
              });
              if (postResponse.data.status !== "processing") {
                throw new Error("API did not accept processing request");
              }
              console.log(`[Http] Request sent. Waiting for audio...`);
            } catch (apiError) {
              ws.close();
              clearTimeout(timeout);
              reject(apiError);
            }
          }
          if (message.action === "ttsCompleted" && message.jobId === jobId) {
            console.log(`[WS] Generation Complete!`);
            ws.close();
            clearTimeout(timeout);
            resolve({
              status: "success",
              ...message.data
            });
          }
        } catch (parseError) {
          console.error("Error parsing WS message:", parseError);
        }
      });
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new VoiceRankings();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Paramenter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: "Paramenter 'text' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'generate'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}