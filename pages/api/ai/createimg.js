import axios from "axios";
import FormData from "form-data";
import {
  randomBytes
} from "crypto";
import apiConfig from "@/configs/apiConfig";
const CONSTANTS = {
  API_URL: "https://www.createimg.com?api=v1",
  BASE_URL: "https://www.createimg.com/",
  TOKEN_API: `https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`,
  SITE_KEY: "0x4AAAAAABggkaHPwa2n_WBx",
  HEADERS: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Origin: "https://www.createimg.com",
    Referer: "https://www.createimg.com/"
  }
};
class CreateImg {
  constructor() {
    this.client = axios.create({
      headers: CONSTANTS.HEADERS,
      timeout: 12e4
    });
    this.session = {
      token: null,
      security: null,
      server: null,
      maxSize: 1024,
      module: "create"
    };
  }
  _log(tag, msg) {
    console.log(`\x1b[36m[CreateImg]\x1b[0m \x1b[33m[${tag}]\x1b[0m ${msg}`);
  }
  _genVisitorId() {
    return randomBytes(16).toString("hex");
  }
  _parseDataUri(dataUri) {
    const split = dataUri.split(",");
    const type = split[0].match(/:(.*?);/)[1];
    const buffer = Buffer.from(split[1], "base64");
    return {
      buffer: buffer,
      contentType: type
    };
  }
  async _toBuffer(source) {
    if (!source) return null;
    if (Buffer.isBuffer(source)) return source;
    try {
      if (typeof source === "string" && /^https?:\/\//.test(source)) {
        const res = await axios.get(source, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      if (typeof source === "string") {
        return Buffer.from(source.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
    } catch (e) {
      throw new Error(`Gagal memproses gambar: ${e.message}`);
    }
    return null;
  }
  async initialize(moduleType) {
    try {
      this._log("INIT", `Memulai sesi (${moduleType})...`);
      const {
        data: cfData
      } = await axios.get(CONSTANTS.TOKEN_API, {
        params: {
          url: CONSTANTS.BASE_URL,
          sitekey: CONSTANTS.SITE_KEY
        }
      });
      const cfToken = cfData.result || cfData.token;
      if (!cfToken) throw new Error("Gagal mendapatkan CF Token");
      const visitorId = this._genVisitorId();
      const formData = new URLSearchParams({
        token: cfToken,
        security: visitorId,
        action: "turnstile",
        module: moduleType
      });
      const {
        data
      } = await this.client.post(CONSTANTS.API_URL, formData);
      if (!data.status) {
        if (data.eta) throw new Error(`Rate Limit! Tunggu ${data.eta} detik.`);
        throw new Error(`Handshake Error: ${data.message}`);
      }
      this.session.token = cfToken;
      this.session.security = visitorId;
      this.session.server = data.server;
      this.session.maxSize = data.size || 1024;
      this.session.module = moduleType;
      this._log("INIT", `Sesi Valid. Server: ${data.server}`);
      return true;
    } catch (e) {
      throw new Error(`Init Failed: ${e.message}`);
    }
  }
  async uploadFiles(filesMap) {
    const uploadedFilenames = {};
    const form = new FormData();
    form.append("token", this.session.token);
    form.append("security", this.session.security);
    form.append("action", "upload");
    form.append("server", this.session.server);
    let hasFiles = false;
    for (const [key, buffer] of Object.entries(filesMap)) {
      if (buffer) {
        this._log("UPLOAD", `Memproses ${key}...`);
        form.append(key, buffer, {
          filename: `${key}.jpg`,
          contentType: "image/jpeg"
        });
        hasFiles = true;
      }
    }
    if (!hasFiles) return {};
    const {
      data
    } = await this.client.post(CONSTANTS.API_URL, form, {
      headers: {
        ...form.getHeaders()
      }
    });
    if (!data.status) throw new Error(`Upload Failed: ${JSON.stringify(data)}`);
    return data.filename;
  }
  async generate({
    prompt,
    imageUrl,
    refUrl,
    negative,
    seed,
    aspect_ratio = "square"
  }) {
    try {
      const moduleType = imageUrl ? "edit" : "create";
      await this.initialize(moduleType);
      const filesMap = {};
      if (imageUrl) filesMap["image"] = await this._toBuffer(imageUrl);
      if (refUrl) filesMap["ref"] = await this._toBuffer(refUrl);
      let uploadedFiles = {};
      if (moduleType === "edit") {
        uploadedFiles = await this.uploadFiles(filesMap);
        if (!uploadedFiles.image) throw new Error("Gagal upload gambar utama");
      }
      const finalSeed = seed || Math.floor(Math.random() * 2147483647);
      const filesPayload = {};
      if (uploadedFiles.image) filesPayload["files[image]"] = uploadedFiles.image;
      if (uploadedFiles.ref) filesPayload["files[ref]"] = uploadedFiles.ref;
      const submitParams = new URLSearchParams();
      submitParams.append("token", this.session.token);
      submitParams.append("security", this.session.security);
      submitParams.append("action", moduleType);
      submitParams.append("server", this.session.server);
      submitParams.append("prompt", prompt);
      submitParams.append("negative", negative || "");
      submitParams.append("seed", finalSeed);
      submitParams.append("size", this.session.maxSize);
      submitParams.append("dimension", aspect_ratio);
      for (const key in filesPayload) {
        submitParams.append(key, filesPayload[key]);
      }
      this._log("JOB", `Mengirim Job (${moduleType})...`);
      const {
        data: jobRes
      } = await this.client.post(CONSTANTS.API_URL, submitParams);
      if (!jobRes.status) throw new Error(`Job Rejected: ${jobRes.message}`);
      const {
        id,
        queue
      } = jobRes;
      this._log("QUEUE", `ID: ${id} | Posisi: ${queue}`);
      let pending = 1;
      let attempts = 0;
      const maxAttempts = 60;
      while (pending > 0 && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 3e3));
        attempts++;
        const queueParams = new URLSearchParams({
          id: id,
          queue: queue,
          module: moduleType,
          action: "queue",
          server: this.session.server,
          token: this.session.token,
          security: this.session.security
        });
        const {
          data: qRes
        } = await this.client.post(CONSTANTS.API_URL, queueParams);
        if (!qRes.status) throw new Error(`Queue Error: ${qRes.message}`);
        pending = qRes.pending || 0;
        if (attempts % 2 === 0) process.stdout.write(".");
      }
      console.log("");
      if (attempts >= maxAttempts) throw new Error("Timeout Polling");
      this._log("HISTORY", "Mengambil metadata output...");
      const histParams = new URLSearchParams({
        id: id,
        action: "history",
        server: this.session.server,
        module: moduleType,
        token: this.session.token,
        security: this.session.security
      });
      const {
        data: histRes
      } = await this.client.post(CONSTANTS.API_URL, histParams);
      if (!histRes.status) throw new Error("Gagal mengambil history file");
      this._log("DOWNLOAD", "Mengunduh gambar akhir...");
      const outParams = new URLSearchParams({
        id: histRes.file,
        action: "output",
        server: this.session.server,
        module: moduleType,
        token: this.session.token,
        security: this.session.security,
        page: "home",
        lang: "en"
      });
      const {
        data: finalRes
      } = await this.client.post(CONSTANTS.API_URL, outParams);
      if (!finalRes.status) throw new Error(`Output Error: ${finalRes.message}`);
      const parsed = this._parseDataUri(finalRes.data);
      this._log("DONE", "Selesai.");
      return {
        status: true,
        ...parsed,
        meta: {
          id: id,
          seed: finalSeed,
          module: moduleType
        }
      };
    } catch (e) {
      this._log("ERROR", e.message);
      return {
        status: false,
        message: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new CreateImg();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}