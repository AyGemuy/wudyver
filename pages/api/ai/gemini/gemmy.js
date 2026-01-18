import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";

function convertPcmToWav(pcmData) {
  try {
    const buffer = new Uint8Array(pcmData);
    const sampleRate = 24e3;
    const channels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const dataSize = buffer.length;
    const fileSize = 36 + dataSize;
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    view.setUint32(0, 1380533830, false);
    view.setUint32(4, fileSize, true);
    view.setUint32(8, 1463899717, false);
    view.setUint32(12, 1718449184, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * bytesPerSample, true);
    view.setUint16(32, channels * bytesPerSample, true);
    view.setUint16(34, bitsPerSample, true);
    view.setUint32(36, 1684108385, false);
    view.setUint32(40, dataSize, true);
    const wavData = new Uint8Array(44 + dataSize);
    wavData.set(new Uint8Array(header), 0);
    wavData.set(buffer, 44);
    return Buffer.from(wavData);
  } catch (e) {
    console.error("[ConvertWAV] Error converting PCM to WAV:", e);
    throw new Error("Failed to convert audio format.");
  }
}
class GeminiService {
  constructor() {
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
    this.apiKey = "AIzaSyDRQNLY08YYuyxpvd-ukd23b-lInPvO6BA";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    this.headers = {
      "Content-Type": "application/json",
      "x-goog-api-key": this.apiKey
    };
  }
  async fetchResourceAsBase64(url) {
    console.log(`[Gemini:Download] Start downloading from: ${url}`);
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const mimeType = response.headers["content-type"];
      const base64Data = Buffer.from(response.data).toString("base64");
      console.log(`[Gemini:Download] Success (${mimeType}, size: ${response.data.length} bytes)`);
      return {
        mimeType: mimeType,
        data: base64Data
      };
    } catch (error) {
      console.error(`[Gemini:Download] Failed: ${error.message}`);
      throw new Error(`Failed to download resource: ${error.message}`);
    }
  }
  async uploadToServer(base64Data, mimeType) {
    console.log(`[Gemini:Upload] Preparing to upload (${mimeType})...`);
    try {
      const buffer = Buffer.from(base64Data, "base64");
      const form = new FormData();
      const ext = mimeType.split("/")[1].replace("wav", "mp3") || "bin";
      const filename = `gemini_gen_${Date.now()}.${ext === "mpeg" ? "mp3" : ext}`;
      form.append("file", buffer, {
        filename: filename,
        contentType: mimeType
      });
      console.log(`[Gemini:Upload] Sending to ${this.uploadUrl}...`);
      const response = await axios.post(this.uploadUrl, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      if (response.data && response.data.result) {
        const resultUrl = response.data.result.url || response.data.result;
        console.log(`[Gemini:Upload] Success: ${resultUrl}`);
        return resultUrl;
      } else {
        throw new Error("Upload response did not contain 'result'.");
      }
    } catch (error) {
      console.error(`[Gemini:Upload] Failed: ${error.message}`);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
  async chat({
    prompt,
    messages = [],
    model = "gemini-2.5-flash",
    system_instruction,
    image_url,
    search = false
  }) {
    console.log(`[Gemini:Chat] Init - Model: ${model}, Search: ${search}, Image: ${!!image_url}`);
    try {
      let contents = [];
      if (messages.length > 0) {
        contents = messages;
      } else {
        const parts = [];
        if (image_url) {
          const imgData = await this.fetchResourceAsBase64(image_url);
          parts.push({
            inline_data: {
              mime_type: imgData.mimeType,
              data: imgData.data
            }
          });
        }
        parts.push({
          text: prompt
        });
        contents.push({
          role: "user",
          parts: parts
        });
      }
      const payload = {
        contents: contents,
        ...system_instruction && {
          system_instruction: {
            parts: [{
              text: system_instruction
            }]
          }
        },
        ...search && {
          tools: [{
            google_search: {}
          }]
        }
      };
      const url = `${this.baseUrl}/${model}:generateContent`;
      console.log(`[Gemini:Chat] POST to ${url}`);
      const response = await axios.post(url, payload, {
        headers: this.headers
      });
      const candidate = response.data.candidates?.[0];
      if (!candidate) throw new Error("No candidates returned from API.");
      const textPart = candidate.content?.parts?.map(p => p.text).join("") || "No text content";
      const grounding = candidate.groundingMetadata;
      console.log(`[Gemini:Chat] Success. Text length: ${textPart.length}`);
      return {
        text: textPart,
        sources: grounding || null,
        raw: response.data
      };
    } catch (error) {
      console.error(`[Gemini:Chat] Error:`, error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }
  async image({
    prompt,
    model = "gemini-2.5-flash-image",
    aspect_ratio = "1:1",
    image_url
  }) {
    console.log(`[Gemini:Image] Init - Model: ${model}, Ratio: ${aspect_ratio}`);
    try {
      const parts = [{
        text: prompt
      }];
      if (image_url) {
        console.log(`[Gemini:Image] Downloading input image for editing...`);
        const imgData = await this.fetchResourceAsBase64(image_url);
        parts.unshift({
          inline_data: {
            mime_type: imgData.mimeType,
            data: imgData.data
          }
        });
      }
      const payload = {
        contents: [{
          parts: parts
        }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: aspect_ratio
          }
        }
      };
      const url = `${this.baseUrl}/${model}:generateContent`;
      console.log(`[Gemini:Image] POST to ${url}`);
      const response = await axios.post(url, payload, {
        headers: this.headers
      });
      const candidate = response.data.candidates?.[0];
      const imgPart = candidate?.content?.parts?.find(p => p.inline_data || p.inlineData);
      if (!imgPart) {
        console.error("[Gemini:Image] No image part found in response:", JSON.stringify(response.data));
        throw new Error("API returned success but no image data found.");
      }
      const rawData = imgPart.inline_data ? imgPart.inline_data.data : imgPart.inlineData.data;
      const mime = imgPart.inline_data ? imgPart.inline_data.mime_type : imgPart.inlineData.mimeType;
      const uploadedUrl = await this.uploadToServer(rawData, mime);
      return {
        url: uploadedUrl,
        prompt: prompt,
        mime: mime
      };
    } catch (error) {
      console.error(`[Gemini:Image] Error:`, error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }
  async audio({
    prompt,
    conversation,
    voice = "Kore",
    model = "gemini-2.5-flash-preview-tts"
  }) {
    console.log(`[Gemini:Audio] Init - Model: ${model}, Voice: ${voice}`);
    try {
      let payload = {};
      if (conversation && Array.isArray(conversation)) {
        console.log(`[Gemini:Audio] Processing Multi-Speaker conversation (${conversation.length} turns)`);
        let dialogText = "TTS the following conversation:\n";
        const speakers = new Set();
        conversation.forEach(c => {
          dialogText += `${c.speaker}: ${c.text}\n`;
          speakers.add(c.speaker);
        });
        const speakerConfigs = [];
        const voicesList = ["Kore", "Puck", "Fenrir", "Leda"];
        let i = 0;
        speakers.forEach(s => {
          speakerConfigs.push({
            speaker: s,
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voicesList[i % voicesList.length]
              }
            }
          });
          i++;
        });
        payload = {
          contents: [{
            parts: [{
              text: dialogText
            }]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: speakerConfigs
              }
            }
          }
        };
      } else {
        console.log(`[Gemini:Audio] Processing Single Speaker`);
        payload = {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice
                }
              }
            }
          }
        };
      }
      const url = `${this.baseUrl}/${model}:generateContent`;
      console.log(`[Gemini:Audio] POST to ${url}`);
      const response = await axios.post(url, payload, {
        headers: this.headers
      });
      const candidate = response.data.candidates?.[0];
      const audioPart = candidate?.content?.parts?.find(p => p.inlineData || p.inline_data);
      if (!audioPart) {
        console.error("[Gemini:Audio] No audio data in response:", JSON.stringify(response.data));
        throw new Error("API returned success but no audio data.");
      }
      const rawBase64 = audioPart.inlineData ? audioPart.inlineData.data : audioPart.inline_data.data;
      console.log(`[Gemini:Audio] Converting PCM to WAV...`);
      const pcmBuffer = Buffer.from(rawBase64, "base64");
      const wavBuffer = convertPcmToWav(pcmBuffer);
      const uploadedUrl = await this.uploadToServer(wavBuffer.toString("base64"), "audio/wav");
      return {
        url: uploadedUrl,
        type: conversation ? "conversation" : "tts",
        original_text: prompt || "Conversation Dialog"
      };
    } catch (error) {
      console.error(`[Gemini:Audio] Error:`, error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: ["chat", "image", "audio"]
    });
  }
  const api = new GeminiService();
  try {
    console.log(`\n--- [API Request] Action: ${action} ---`);
    let response;
    switch (action) {
      case "chat":
        if (!params.prompt && (!params.messages || params.messages.length === 0)) {
          return res.status(400).json({
            error: "Parameter 'prompt' atau 'messages' wajib diisi."
          });
        }
        response = await api.chat(params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi."
          });
        }
        response = await api.image(params);
        break;
      case "audio":
        if (!params.prompt && !params.conversation) {
          return res.status(400).json({
            error: "Parameter 'prompt' atau 'conversation' wajib diisi."
          });
        }
        response = await api.audio(params);
        break;
      default:
        return res.status(400).json({
          error: `Action '${action}' tidak valid.`,
          valid_actions: ["chat", "image", "audio"]
        });
    }
    console.log(`[API Request] Action '${action}' completed successfully.\n`);
    return res.status(200).json({
      status: true,
      result: response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Action '${action}' failed:`, error.message);
    return res.status(500).json({
      status: false,
      error: error?.message || "Internal Server Error",
      debug_info: error.response?.data || "No external API response data"
    });
  }
}