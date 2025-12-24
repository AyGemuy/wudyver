import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class SpeechToText {
  constructor() {
    this.api = {
      base: "https://www.speech-to-text.cloud",
      endpoints: {
        upload: "/athanis/upload",
        transcribe: fid => `/athanis/transcribe/${fid}/yyy`
      }
    };
    this.headers = {
      origin: "https://www.speech-to-text.cloud",
      referer: "https://www.speech-to-text.cloud/",
      "user-agent": "NB Android/1.0.0",
      ...SpoofHead()
    };
  }
  async isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  async isBase64Audio(base64) {
    if (!base64 || typeof base64 !== "string") return false;
    const dataUrlPattern = /^data:audio\/[a-zA-Z0-9]+;base64,/;
    if (dataUrlPattern.test(base64)) return true;
    const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
    return base64Pattern.test(base64) && base64.length > 100;
  }
  async base64ToBuffer(base64) {
    try {
      if (base64.startsWith("data:")) {
        const base64Data = base64.split(",")[1];
        return Buffer.from(base64Data, "base64");
      }
      return Buffer.from(base64, "base64");
    } catch (error) {
      throw new Error("Invalid base64 format");
    }
  }
  async downloadFromUrl(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 3e4,
        headers: {
          "User-Agent": this.headers["user-agent"]
        }
      });
      return {
        buffer: Buffer.from(response.data),
        contentType: response.headers["content-type"] || "audio/mpeg"
      };
    } catch (error) {
      throw new Error(`Failed to download audio from URL: ${error.message}`);
    }
  }
  getFileExtension(contentType) {
    const typeMap = {
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
      "audio/wav": "wav",
      "audio/wave": "wav",
      "audio/x-wav": "wav",
      "audio/ogg": "ogg",
      "audio/mp4": "m4a",
      "audio/aac": "aac",
      "audio/flac": "flac"
    };
    return typeMap[contentType] || "mp3";
  }
  async upload({
    input,
    filename = null,
    contentType = "audio/mpeg"
  }) {
    try {
      if (!input) {
        return {
          success: false,
          code: 400,
          error: "Audio input is required (URL or base64)"
        };
      }
      console.log("Processing audio input...");
      let audioBuffer;
      let finalContentType = contentType;
      let finalFilename = filename;
      if (await this.isValidUrl(input)) {
        console.log("Downloading audio from URL...");
        const downloadResult = await this.downloadFromUrl(input);
        audioBuffer = downloadResult.buffer;
        finalContentType = downloadResult.contentType;
        if (!finalFilename) {
          const extension = this.getFileExtension(finalContentType);
          finalFilename = `audio.${extension}`;
        }
      } else if (await this.isBase64Audio(input)) {
        console.log("Converting base64 to audio buffer...");
        audioBuffer = await this.base64ToBuffer(input);
        if (!finalFilename) {
          const extension = this.getFileExtension(finalContentType);
          finalFilename = `audio.${extension}`;
        }
      } else {
        return {
          success: false,
          code: 400,
          error: "Invalid input format. Please provide a valid URL or base64 audio data"
        };
      }
      console.log("Uploading audio for transcription...");
      const form = new FormData();
      form.append("audio_file", audioBuffer, {
        filename: finalFilename,
        contentType: finalContentType
      });
      const response = await axios.post(`${this.api.base}${this.api.endpoints.upload}`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        },
        timeout: 6e4
      });
      const fid = response.data?.fid;
      if (!fid) {
        return {
          success: false,
          code: 500,
          error: "Failed to get file ID from server"
        };
      }
      console.log("Audio uploaded successfully");
      return {
        success: true,
        code: 200,
        data: {
          fid: fid,
          filename: finalFilename,
          contentType: finalContentType
        }
      };
    } catch (error) {
      console.error("Error in upload:", error.message);
      if (error?.response?.status === 429) {
        return {
          success: false,
          code: 429,
          error: "Too many requests. Please try again later"
        };
      }
      return {
        success: false,
        code: error?.response?.status || 500,
        error: error.message || "Upload failed"
      };
    }
  }
  async transcribe({
    fid
  }) {
    try {
      if (!fid) {
        return {
          success: false,
          code: 400,
          error: "File ID is required"
        };
      }
      console.log("Starting transcription process...");
      const url = `${this.api.base}${this.api.endpoints.transcribe(fid)}`;
      let transcript = "";
      const response = await axios.get(url, {
        headers: {
          ...this.headers,
          accept: "*/*"
        },
        responseType: "stream",
        timeout: 0
      });
      await new Promise((resolve, reject) => {
        response.data.on("data", chunk => {
          const lines = chunk.toString("utf8").split(/\r?\n/);
          for (const line of lines) {
            if (!line) continue;
            if (line.startsWith("#progress#")) {
              console.log(`Transcription progress: ${line.replace("#progress#", "").trim()}`);
            } else {
              console.log(`Transcription data: ${line}`);
              transcript += line + "\n";
            }
          }
        });
        response.data.on("end", resolve);
        response.data.on("error", reject);
      });
      console.log("Transcription completed");
      return {
        success: true,
        code: 200,
        data: {
          transcript: transcript.trim() || "No speech detected"
        }
      };
    } catch (error) {
      console.error("Error in transcribe:", error.message);
      if (error?.response?.status === 429) {
        return {
          success: false,
          code: 429,
          error: "Too many requests. Please try again later"
        };
      }
      return {
        success: false,
        code: error?.response?.status || 500,
        error: error.message || "Transcription failed"
      };
    }
  }
  async generate({
    input,
    filename = null,
    contentType = "audio/mpeg"
  }) {
    try {
      const uploadResult = await this.upload({
        input: input,
        filename: filename,
        contentType: contentType
      });
      if (!uploadResult.success) {
        return uploadResult;
      }
      const transcribeResult = await this.transcribe({
        fid: uploadResult.data.fid
      });
      if (!transcribeResult.success) {
        return transcribeResult;
      }
      return {
        success: true,
        code: 200,
        data: {
          fid: uploadResult.data.fid,
          transcript: transcribeResult.data.transcript,
          filename: uploadResult.data.filename,
          contentType: uploadResult.data.contentType
        }
      };
    } catch (error) {
      console.error("Error in processAudio:", error.message);
      return {
        success: false,
        code: 500,
        error: error.message || "Audio processing failed"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.input) {
    return res.status(400).json({
      error: "Parameter 'input' diperlukan"
    });
  }
  const api = new SpeechToText();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}