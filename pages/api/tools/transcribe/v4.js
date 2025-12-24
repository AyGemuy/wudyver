import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class UniscribeClient {
  constructor() {
    this.config = {
      supabaseUrl: "https://bgcrcrsosqswpseimvvx.supabase.co",
      apiUrl: "https://api.uniscribe.co",
      apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnY3JjcnNvc3Fzd3BzZWltdnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg2NTcwOTgsImV4cCI6MjA0NDIzMzA5OH0.VH_PR47VlkvE5kDZv8Ch6H-zUGDr4mSZ9Wr5KvQ9ixc",
      endpoints: {
        signup: "/auth/v1/signup",
        user: "/user",
        signedUrl: "/upload/generate-signed-url",
        complete: "/upload/complete",
        patch: "/transcriptions",
        task: "/tasks/transcription",
        poll: "/transcriptions"
      }
    };
    this.token = null;
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "id-ID",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      Pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async signup() {
    try {
      console.log("signup");
      const res = await axios.post(`${this.config.supabaseUrl}${this.config.endpoints.signup}`, {
        data: {},
        gotrue_meta_security: {}
      }, {
        headers: {
          ...this.headers,
          apikey: this.config.apikey,
          authorization: `Bearer ${this.config.apikey}`,
          origin: "https://www.uniscribe.co",
          referer: "https://www.uniscribe.co/",
          "x-client-info": "supabase-js-web/2.45.4",
          "x-supabase-api-version": "2024-01-01"
        }
      });
      this.token = res.data?.access_token ?? null;
      console.log("signup ok");
      return res.data;
    } catch (e) {
      console.error("signup err", e?.message ?? e);
      throw e;
    }
  }
  async getUser() {
    try {
      console.log("getUser");
      if (!this.token) await this.signup();
      const res = await axios.get(`${this.config.apiUrl}${this.config.endpoints.user}`, {
        headers: {
          ...this.headers,
          Authorization: `Bearer ${this.token}`,
          Origin: "https://www.uniscribe.co",
          Referer: "https://www.uniscribe.co/"
        }
      });
      console.log("getUser ok");
      return res.data;
    } catch (e) {
      console.error("getUser err", e?.message ?? e);
      throw e;
    }
  }
  async getSignedUrl(opts) {
    try {
      console.log("getSignedUrl");
      if (!this.token) await this.signup();
      const res = await axios.post(`${this.config.apiUrl}${this.config.endpoints.signedUrl}`, opts, {
        headers: {
          ...this.headers,
          Authorization: `Bearer ${this.token}`,
          Origin: "https://www.uniscribe.co",
          Referer: "https://www.uniscribe.co/"
        }
      });
      console.log("getSignedUrl ok");
      return res.data;
    } catch (e) {
      console.error("getSignedUrl err", e?.message ?? e);
      throw e;
    }
  }
  async uploadFile(url, buffer) {
    try {
      console.log("uploadFile");
      await axios.put(url, buffer, {
        headers: {
          "Content-Type": "audio/wav"
        }
      });
      console.log("uploadFile ok");
    } catch (e) {
      console.error("uploadFile err", e?.message ?? e);
      throw e;
    }
  }
  async completeUpload(id) {
    try {
      console.log("completeUpload");
      const res = await axios.post(`${this.config.apiUrl}${this.config.endpoints.complete}`, {
        transcriptionFileId: id
      }, {
        headers: {
          ...this.headers,
          Authorization: `Bearer ${this.token}`,
          Origin: "https://www.uniscribe.co",
          Referer: "https://www.uniscribe.co/"
        }
      });
      console.log("completeUpload ok");
      return res.data;
    } catch (e) {
      console.error("completeUpload err", e?.message ?? e);
      throw e;
    }
  }
  async patchLang(id, lang) {
    try {
      console.log("patchLang");
      const res = await axios.patch(`${this.config.apiUrl}${this.config.endpoints.patch}/${id}`, {
        languageCode: lang
      }, {
        headers: {
          ...this.headers,
          Authorization: `Bearer ${this.token}`,
          Origin: "https://www.uniscribe.co",
          Referer: "https://www.uniscribe.co/"
        }
      });
      console.log("patchLang ok");
      return res.data;
    } catch (e) {
      console.error("patchLang err", e?.message ?? e);
      throw e;
    }
  }
  async createTask(id) {
    try {
      console.log("createTask");
      const res = await axios.post(`${this.config.apiUrl}${this.config.endpoints.task}`, {
        transcriptionFileId: id
      }, {
        headers: {
          ...this.headers,
          Authorization: `Bearer ${this.token}`,
          Origin: "https://www.uniscribe.co",
          Referer: "https://www.uniscribe.co/"
        }
      });
      console.log("createTask ok");
      return res.data;
    } catch (e) {
      console.error("createTask err", e?.message ?? e);
      throw e;
    }
  }
  async pollStatus(id, interval = 3e3, max = 6e4) {
    try {
      console.log("pollStatus");
      const start = Date.now();
      while (Date.now() - start < max) {
        const res = await axios.get(`${this.config.apiUrl}${this.config.endpoints.poll}/${id}`, {
          headers: {
            ...this.headers,
            Authorization: `Bearer ${this.token}`,
            Origin: "https://www.uniscribe.co",
            Referer: "https://www.uniscribe.co/"
          }
        });
        console.log("poll", res.data?.status ?? "??");
        if (res.data?.status === "completed") return res.data;
        await new Promise(r => setTimeout(r, interval));
      }
      throw new Error("poll timeout");
    } catch (e) {
      console.error("pollStatus err", e?.message ?? e);
      throw e;
    }
  }
  async generate({
    lang = "id",
    input,
    ...rest
  }) {
    try {
      console.log("generate");
      if (!this.token) await this.signup();
      let buffer;
      if (typeof input === "string" && input.startsWith("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        buffer = res.data;
      } else if (typeof input === "string" && input.startsWith("data:")) {
        buffer = Buffer.from(input.split(",")[1] ?? "", "base64");
      } else if (input instanceof Buffer) {
        buffer = input;
      } else {
        throw new Error("input: url/base64/buffer");
      }
      const size = buffer?.length ?? 0;
      const md5 = crypto.createHash("md5").update(buffer).digest("base64");
      const opts = {
        filename: rest?.filename ?? "tts-audio",
        fileType: rest?.fileType ?? "wav",
        fileSize: size,
        contentMd5Base64: md5,
        duration: rest?.duration ?? 18,
        forceUpload: rest?.forceUpload ?? true,
        languageCode: lang,
        transcriptionType: rest?.transcriptionType ?? "transcript",
        enableSpeakerDiarization: rest?.enableSpeakerDiarization ?? false
      };
      const signed = await this.getSignedUrl(opts);
      await this.uploadFile(signed.preSignedUrl, buffer);
      await this.completeUpload(signed.transcriptionFileId);
      await this.patchLang(signed.transcriptionFileId, lang);
      await this.createTask(signed.transcriptionFileId);
      const result = await this.pollStatus(signed.transcriptionFileId);
      console.log("generate ok");
      return result;
    } catch (e) {
      console.error("generate err", e?.message ?? e);
      throw e;
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
  const api = new UniscribeClient();
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