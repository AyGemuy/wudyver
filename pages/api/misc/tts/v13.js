import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class OpenAi {
  constructor() {
    this.voices = ["Alloy", "Ash", "Ballad", "Coral", "Echo", "Fable", "Onyx", "Nova", "Sage", "Shimmer", "Verse"];
    this.vibes = ["Santa", "True Crime Buff", "Old-Timey", "Robot", "Eternal Optimist"];
    this.apiBase = "https://www.openai.fm/api/generate";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload?host=Catbox`;
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
  async uploadMedia(buffer, mimeType = "audio/mpeg") {
    try {
      const base64Image = buffer.toString("base64");
      const dataUri = `data:${mimeType};base64,${base64Image}`;
      const requestData = {
        file: dataUri
      };
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, requestData);
      if (!uploadResponse) {
        throw new Error("Upload failed");
      }
      return uploadResponse;
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
  async generate({
    text,
    prompt = this.defaultPrompt,
    voice = this.voices[3],
    vibe = this.vibes[0]
  }) {
    console.log("Memulai proses pembuatan audio...");
    const error = this.isValid(text, prompt);
    if (error) return {
      status: false,
      code: 400,
      error: error
    };
    if (!this.voices.includes(voice)) return {
      status: false,
      code: 400,
      error: `Voice tidak valid: ${this.voices.join(", ")}`
    };
    if (vibe && !this.vibes.includes(vibe)) return {
      status: false,
      code: 400,
      error: `Vibe tidak valid: ${this.vibes.join(", ")}`
    };
    try {
      console.log("Mengirim permintaan ke OpenAi API...");
      const formData = new FormData();
      formData.append("input", text);
      formData.append("prompt", Object.entries(prompt).map(([k, v]) => `${k}: ${v}`).join("\n"));
      formData.append("voice", voice.toLowerCase());
      formData.append("vibe", vibe);
      const {
        data
      } = await axios.post(this.apiBase, formData, {
        responseType: "arraybuffer"
      });
      console.log("Respons API diterima, mengunggah audio...");
      const url = await this.uploadMedia(data);
      console.log("Proses selesai, audio tersedia di:", url);
      return {
        status: true,
        code: 200,
        audio: url
      };
    } catch (e) {
      console.error("Kesalahan saat membuat audio:", e.message);
      return {
        status: false,
        code: e.response?.status || 500,
        error: e.response?.data?.toString() || "Terjadi kesalahan"
      };
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
  const ai = new OpenAi();
  try {
    const data = await ai.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}