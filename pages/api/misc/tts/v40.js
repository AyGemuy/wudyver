import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class Botika {
  constructor() {
    this.baseURL = "https://api.botika.online/public/voicebotika";
    this.userAgent = "Dart/3.2 (dart:io)";
    this.headers = {
      "User-Agent": this.userAgent,
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json"
    };
  }
  log(msg, type = "INFO") {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [BOTIKA] [${type}] ${msg}`);
  }
  randomHex(length = 8) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
  }
  randomNumeric(length = 15) {
    const bytes = crypto.randomBytes(length);
    let result = "";
    for (let i = 0; i < length; i++) {
      result += (bytes[i] % 10).toString();
    }
    return result;
  }
  generateCredentials() {
    const base = this.randomHex(10);
    return {
      email: `${base}@mail.com`,
      password: `${base.charAt(0).toUpperCase()}${base.slice(1)}${crypto.randomInt(10, 99)}!`,
      imei: this.randomNumeric(15)
    };
  }
  async bufferFromInput(input) {
    try {
      if (Buffer.isBuffer(input)) {
        return {
          success: true,
          data: input
        };
      }
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          this.log("Downloading audio from URL...");
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return {
            success: true,
            data: Buffer.from(res.data)
          };
        }
        if (input.length > 100 && !input.includes("\0")) {
          return {
            success: true,
            data: Buffer.from(input, "base64")
          };
        }
      }
      return {
        success: false,
        message: "Invalid audio input (Buffer/URL/Base64 required)"
      };
    } catch (e) {
      this.log(`Buffer Error: ${e.message}`, "ERROR");
      return {
        success: false,
        message: `Audio processing failed: ${e.message}`
      };
    }
  }
  async req(url, method = "POST", data = {}, headers = {}) {
    try {
      const config = {
        method: method,
        url: url,
        headers: {
          ...this.headers,
          ...headers
        },
        data: data
      };
      if (data instanceof FormData) {
        Object.assign(config.headers, data.getHeaders());
      }
      this.log(`${method} ${url.split("/").pop()}`);
      const response = await axios(config);
      return {
        success: true,
        data: response?.data
      };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      this.log(`Request Error: ${errMsg}`, "ERROR");
      return {
        success: false,
        message: errMsg
      };
    }
  }
  async ensureAuth({
    email,
    pass
  }) {
    try {
      let creds = {
        email: email,
        password: pass
      };
      let isNew = false;
      if (!creds.email || !creds.password) {
        const gen = this.generateCredentials();
        creds = {
          email: gen.email,
          password: gen.password,
          imei: gen.imei
        };
        isNew = true;
        this.log(`Generated random credentials: ${creds.email}`);
      }
      if (isNew) {
        const regData = {
          email: creds.email,
          password: creds.password,
          imei: creds.imei || this.randomNumeric(15),
          botika_credit: true
        };
        await this.req(`${this.baseURL}/gateway/account/register.php`, "POST", regData);
      }
      const loginData = {
        email: creds.email,
        password: creds.password,
        source: "voice",
        botika_credit: true
      };
      const res = await this.req(`${this.baseURL}/gateway/account/login.php`, "POST", loginData);
      const accessToken = res?.data?.data?.accessToken;
      if (!res.success || !accessToken) {
        return {
          success: false,
          message: res.message || "Authentication failed (Login failed or no token)"
        };
      }
      return {
        success: true,
        email: creds.email,
        pass: creds.password,
        accessToken: accessToken,
        patToken: res.data?.data?.pat_token,
        accountId: res.data?.data?.account_id
      };
    } catch (e) {
      this.log(`Auth Internal Error: ${e.message}`, "ERROR");
      return {
        success: false,
        message: e.message
      };
    }
  }
  async uploadAudio(input, tokens) {
    try {
      const bufResult = await this.bufferFromInput(input);
      if (!bufResult.success) return bufResult;
      const form = new FormData();
      const filename = `rec_${Date.now()}_${this.randomHex(4)}.wav`;
      form.append("audio", bufResult.data, {
        filename: filename,
        contentType: "application/octet-stream",
        header: {
          "content-type": "application/octet-stream"
        }
      });
      const headers = {
        "pat-token": tokens?.patToken,
        authorization: `Bearer ${tokens?.accessToken}`
      };
      const res = await this.req(`${this.baseURL}/gateway/anima/upload.php`, "POST", form, headers);
      if (res.success && res.data?.url) {
        return {
          success: true,
          url: res.data.url
        };
      }
      return {
        success: false,
        message: res.message || "Upload failed"
      };
    } catch (e) {
      return {
        success: false,
        message: `Upload Exception: ${e.message}`
      };
    }
  }
  async pollStatus(endpoint, payload, tokens, extractFn, targetStatus) {
    let attempts = 0;
    const maxAttempts = 60;
    this.log(`Polling started. Waiting for: '${targetStatus}'...`);
    try {
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3e3));
        const headers = {
          "pat-token": tokens?.patToken,
          authorization: `Bearer ${tokens?.accessToken}`
        };
        const res = await this.req(endpoint, "POST", payload, headers);
        if (!res.success) {
          this.log(`Polling request failed: ${res.message}`, "WARN");
        }
        const item = extractFn(res?.data);
        if (item) {
          const status = item?.status;
          this.log(`Status: ${status}`);
          if (status === targetStatus) {
            return {
              success: true,
              result: item
            };
          }
          if (["FAILED", "ERROR", "CANCELLED"].includes(status)) {
            return {
              success: false,
              message: `Process failed with status: ${status}`
            };
          }
        }
        attempts++;
      }
      return {
        success: false,
        message: "Polling timed out without reaching target status"
      };
    } catch (e) {
      return {
        success: false,
        message: `Polling Exception: ${e.message}`
      };
    }
  }
  async voice_list({
    email,
    pass,
    lang = true,
    ...rest
  }) {
    try {
      const auth = await this.ensureAuth({
        email: email,
        pass: pass
      });
      if (!auth.success) return auth;
      const headers = {
        "pat-token": auth.patToken,
        authorization: `Bearer ${auth.accessToken}`
      };
      const payload = {
        accessToken: auth.accessToken,
        api: "list",
        type: lang ? "language" : "voice",
        language: rest.language || (lang ? "en-US" : "id-ID"),
        ...lang ? {} : {
          voiceType: "all"
        },
        ...rest
      };
      const res = await this.req(`${this.baseURL}/gateway/text_to_speech.php`, "POST", payload, headers);
      if (!res.success) return res;
      return {
        success: true,
        email: auth.email,
        pass: auth.pass,
        data: res.data?.data || []
      };
    } catch (err) {
      return {
        success: false,
        message: err.message
      };
    }
  }
  async generate({
    email,
    pass,
    mode = "tts",
    text,
    audio,
    ...rest
  }) {
    try {
      const validModes = ["tts", "stt"];
      if (!validModes.includes(mode?.toLowerCase())) {
        return {
          success: false,
          message: `Invalid mode '${mode}'. Available modes: ${validModes.join(", ")}`
        };
      }
      if (mode === "tts" && !text) {
        return {
          success: false,
          message: "Parameter 'text' is required for TTS mode."
        };
      }
      if (mode === "stt" && !audio) {
        return {
          success: false,
          message: "Parameter 'audio' is required for STT mode."
        };
      }
      const auth = await this.ensureAuth({
        email: email,
        pass: pass
      });
      if (!auth.success) return auth;
      const headers = {
        "pat-token": auth.patToken,
        authorization: `Bearer ${auth.accessToken}`
      };
      let pollResult = null;
      if (mode === "stt") {
        const uploadRes = await this.uploadAudio(audio, auth);
        if (!uploadRes.success) return uploadRes;
        const initPayload = {
          api: "speech_to_text_botika",
          languageCode: rest.languageCode || "id-ID",
          botika_credit: true,
          audio: uploadRes.url,
          timestamp: false,
          responseType: "text",
          ...rest
        };
        const initRes = await this.req(`${this.baseURL}/stt/generate.php`, "POST", initPayload, headers);
        const id = initRes?.data?.data?.id;
        if (!initRes.success || !id) {
          return {
            success: false,
            message: "STT Initialization failed (No ID returned)"
          };
        }
        pollResult = await this.pollStatus(`${this.baseURL}/stt/refresh.php`, {
          ids: [id]
        }, auth, r => r?.data?.[0], "SUCCESS");
      } else {
        const initPayload = {
          text: text,
          voice: rest.voice || "Ajeng",
          language: rest.language || "Indonesia",
          language_code: rest.languageCode || "id-ID",
          voice_name: rest.voice || "Ajeng",
          botika_credit: true,
          ...rest
        };
        const initRes = await this.req(`${this.baseURL}/history/generate.php`, "POST", initPayload, headers);
        const historyId = initRes?.data?.data?.history_id;
        if (!initRes.success || !historyId) {
          return {
            success: false,
            message: "TTS Initialization failed (No History ID returned)"
          };
        }
        pollResult = await this.pollStatus(`${this.baseURL}/history/refresh.php`, {
          type: "tts",
          history_id: [historyId]
        }, auth, r => r?.data?.[0], "DONE");
      }
      if (!pollResult.success) {
        return pollResult;
      }
      return {
        success: true,
        email: auth.email,
        pass: auth.pass,
        mode: mode,
        result: pollResult.result
      };
    } catch (err) {
      this.log(`Generate Critical Error: ${err.message}`, "ERROR");
      return {
        success: false,
        message: `Internal Error: ${err.message}`
      };
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
      error: "Parameter 'action' wajib diisi",
      actions: ["generate", "voice_list"]
    });
  }
  const api = new Botika();
  try {
    let result;
    switch (action) {
      case "generate":
        result = await api.generate(params);
        break;
      case "voice_list":
        result = await api.voice_list();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "voice_list"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server"
    });
  }
}