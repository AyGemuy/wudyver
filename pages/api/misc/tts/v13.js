import axios from "axios";
import {
  randomUUID
} from "crypto";
class OpenAiFM {
  constructor() {
    this.voices = ["Alloy", "Ash", "Ballad", "Coral", "Echo", "Fable", "Onyx", "Nova", "Sage", "Shimmer", "Verse"];
    this.vibes = ["Santa", "True Crime Buff", "Old-Timey", "Robot", "Eternal Optimist"];
    this.apiBase = "https://www.openai.fm/api/generate";
    this.defaultPrompt = {
      identity: "Pembicara yang profesional",
      affect: "Berwibawa dan ramah",
      tone: "Profesional dan mudah dimengerti",
      emotion: "Percaya diri dan menginspirasi",
      pronunciation: "Jelas dan tegas",
      pause: "Jeda strategis untuk penekanan"
    };
  }
  isValid(input, prompt) {
    if (!input?.trim()) return "Input tidak boleh kosong";
    const required = Object.keys(this.defaultPrompt);
    const missing = required.filter(p => !prompt?.[p]);
    return missing.length ? `Prompts ${missing.join(", ")} harus diisi` : null;
  }
  buildPrompt(customPrompt = {}) {
    try {
      const final = {
        ...this.defaultPrompt,
        ...customPrompt
      };
      return Object.entries(final).map(([key, value]) => `${key}: ${value}`).join("\n");
    } catch (err) {
      console.error("buildPrompt error:", err.message);
      return Object.entries(this.defaultPrompt).map(([k, v]) => `${k}: ${v}`).join("\n");
    }
  }
  async generate({
    text = "",
    prompt = {},
    voice = "Coral",
    vibe = "Santa",
    generation = null
  } = {}) {
    const startTime = Date.now();
    const genId = generation || randomUUID();
    console.log(`[${genId}] Start: ${voice}/${vibe}, ${text.length} chars`);
    try {
      const validationError = this.isValid(text, prompt);
      if (validationError) {
        console.warn(`[${genId}] Validation failed: ${validationError}`);
        return {
          success: false,
          error: validationError
        };
      }
      if (!this.voices.map(v => v.toLowerCase()).includes(voice.toLowerCase())) {
        console.warn(`[${genId}] Invalid voice: ${voice}`);
        return {
          success: false,
          error: `Voice tidak valid: ${this.voices.join(", ")}`
        };
      }
      if (vibe && !this.vibes.includes(vibe)) {
        console.warn(`[${genId}] Invalid vibe: ${vibe}`);
        return {
          success: false,
          error: `Vibe tidak valid: ${this.vibes.join(", ")}`
        };
      }
    } catch (err) {
      console.error(`[${genId}] Validation error:`, err.message);
      return {
        success: false,
        error: "Validasi internal error"
      };
    }
    let response;
    try {
      const params = new URLSearchParams();
      params.append("input", text);
      params.append("prompt", this.buildPrompt(prompt));
      params.append("voice", voice.toLowerCase());
      params.append("vibe", vibe);
      params.append("generation", genId);
      const url = `${this.apiBase}?${params.toString()}`;
      response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 12e4,
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          Referer: "https://www.openai.fm/",
          Range: "bytes=0-",
          "sec-ch-ua": `"Chromium";v="127", "Not)A;Brand";v="99"`,
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      const duration = Date.now() - startTime;
      console.log(`[${genId}] Success: ${(response.data.length / 1024).toFixed(1)} KB, ${duration}ms`);
      return {
        success: true,
        buffer: Buffer.from(response.data),
        contentType: "audio/mpeg",
        filename: `tts-${genId}.mp3`,
        generation: genId,
        size: response.headers["content-length"] || response.data.length,
        durationMs: duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const status = error.response?.status;
      if (status === 429) {
        console.warn(`[${genId}] Rate limited (429), ${duration}ms`);
        return {
          success: false,
          error: "Terlalu banyak request, coba lagi dalam beberapa detik"
        };
      }
      if (error.code === "ECONNABORTED") {
        console.error(`[${genId}] Timeout, ${duration}ms`);
        return {
          success: false,
          error: "Request timeout, teks mungkin terlalu panjang"
        };
      }
      console.error(`[${genId}] Failed: ${status || "unknown"}, ${error.message}`);
      return {
        success: false,
        error: error.response ? `Server error ${status}: ${error.response.data?.toString("utf-8").slice(0, 200)}` : error.message || "Unknown error",
        status: status
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Parameter 'text' diperlukan"
    });
  }
  const api = new OpenAiFM();
  try {
    const result = await api.generate(params);
    if (!result.success) {
      return res.status(result.status || 400).json({
        error: result.error
      });
    }
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", result.size);
    res.setHeader("Content-Disposition", `inline; filename="${result.filename}"`);
    return res.send(result.buffer);
  } catch (error) {
    console.error("TTS handler error:", error.message);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan saat memproses"
    });
  }
}