import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class ApiService {
  constructor() {
    this.baseUrl = "https://django-app-4tbtjdxw2a-uc.a.run.app";
    this.defaultLang = "dart";
  }
  _log(msg, type = "INFO") {
    const time = new Date().toISOString().split("T")[1].slice(0, -1);
    console.log(`[${time}] [${type}] ${msg}`);
  }
  _handleError(error, context = "") {
    let status = error.response?.status || "UNKNOWN";
    let message = error.message;
    let detail = error.response?.data;
    this._log(`Failed at [${context}]: ${status} - ${message}`, "ERROR");
    if (detail) this._log(`Server Detail: ${JSON.stringify(detail)}`, "ERROR");
    throw error;
  }
  _normalizeLanguage(langInput) {
    try {
      const DEFAULT_ID = 10;
      if (langInput === undefined || langInput === null) return DEFAULT_ID;
      if (typeof langInput === "number") return langInput;
      const lang = langInput.toString().toLowerCase().trim();
      const idMap = {
        html: 2,
        c: 4,
        "c++": 6,
        cpp: 6,
        "c#": 8,
        csharp: 8,
        cs: 8,
        dart: 10,
        flutter: 10,
        java: 12,
        swift: 14,
        python: 16,
        py: 16,
        r: 18,
        javascript: 20,
        js: 20,
        matlab: 22,
        ruby: 24,
        rb: 24,
        typescript: 26,
        ts: 26,
        kotlin: 28,
        kt: 28,
        go: 30,
        golang: 30,
        jshell: 32,
        python2: 34,
        py2: 34,
        groovy: 36,
        nodejs: 38,
        node: 38,
        scala: 40,
        assembly: 42,
        asm: 42,
        julia: 44,
        "objective-j": 46,
        objj: 46,
        rust: 48,
        rs: 48,
        react: 50,
        reactjs: 50,
        angular: 52,
        perl: 54,
        pl: 54,
        lua: 56,
        php: 58,
        jquery: 60,
        bootstrap: 62,
        vue: 64,
        vuejs: 64,
        "objective-c": 66,
        objc: 66,
        clojure: 68,
        clj: 68,
        vue3: 70,
        fortran: 72,
        fs: 72,
        cobol: 74,
        cbl: 74,
        crystal: 76,
        cr: 76
      };
      return idMap[lang] || DEFAULT_ID;
    } catch (e) {
      return 10;
    }
  }
  async _processMedia(input) {
    if (!input) return null;
    try {
      if (Buffer.isBuffer(input)) {
        this._log("Media detected: Buffer");
        return input;
      }
      if (typeof input === "string") {
        const trimmed = input.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
          this._log(`Media detected: URL. Downloading...`);
          try {
            const response = await axios.get(trimmed, {
              responseType: "arraybuffer"
            });
            return Buffer.from(response.data);
          } catch (e) {
            throw new Error(`Failed download: ${e.message}`);
          }
        }
        if (trimmed.startsWith("data:") || trimmed.length > 100 && !trimmed.includes(" ")) {
          this._log("Media detected: Base64 string.");
          const base64Data = trimmed.replace(/^data:.+;base64,/, "");
          return Buffer.from(base64Data, "base64");
        }
      }
      return null;
    } catch (e) {
      throw e;
    }
  }
  _getRandomIp() {
    try {
      return [...crypto.randomBytes(4)].join(".");
    } catch {
      return "127.0.0.1";
    }
  }
  async generate({
    prompt,
    media,
    ...rest
  }) {
    this._log("-------------------------------------------");
    this._log("Generate Process Started");
    try {
      const hasMedia = media !== null && media !== undefined && media !== "";
      let type = rest?.type || "code";
      if (hasMedia && type === "code") {
        type = "solve";
        this._log("Media detected, switching default type to 'solve'");
      }
      if (hasMedia) {
        if (type === "design") {
          return await this._multipartRequest("/design_to_code/", {
            prompt: prompt,
            ...rest
          }, media, "image", "design.jpg");
        }
        if (type === "doc") {
          return await this._multipartRequest("/solve_with_doc/", {
            prompt: prompt,
            ...rest
          }, media, "document", "file.txt");
        }
        return await this._multipartRequest("/image_to_solve/", {
          prompt: prompt,
          ...rest
        }, media, "image", "upload.jpg");
      } else {
        this._log("No media detected, using JSON flow.");
        switch (type) {
          case "bugs":
            return await this._jsonRequest("/detect_bugs/", {
              code: prompt
            });
          case "convert":
            return await this._jsonRequest("/convert_code/", {
              prompt: prompt,
              ...rest
            });
          case "explain":
            return await this._jsonRequest("/code_explainer/", {
              code: prompt,
              optional_param: rest?.context || ""
            });
          case "code":
          default:
            return await this._jsonRequest("/prompt_to_code/", {
              prompt: prompt,
              ...rest
            });
        }
      }
    } catch (e) {
      this._handleError(e, "Generate Logic");
    }
  }
  async _jsonRequest(endpoint, payload) {
    const url = `${this.baseUrl}${endpoint}`;
    if (payload.language) payload.language = this._normalizeLanguage(payload.language);
    else if (!payload.language && payload.prompt) payload.language = this._normalizeLanguage(this.defaultLang);
    if (!payload.ip_address) payload.ip_address = this._getRandomIp();
    this._log(`POST JSON: ${endpoint} | Lang ID: ${payload.language}`);
    try {
      const res = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      });
      return res.data;
    } catch (e) {
      throw e;
    }
  }
  async _multipartRequest(endpoint, fields, mediaSource, fileKey, fileName) {
    const url = `${this.baseUrl}${endpoint}`;
    const validLangId = this._normalizeLanguage(fields.language || this.defaultLang);
    this._log(`POST MULTIPART: ${endpoint} | Lang ID: ${validLangId}`);
    try {
      const fileBuffer = await this._processMedia(mediaSource);
      if (!fileBuffer) throw new Error("Invalid media");
      const form = new FormData();
      form.append("prompt", fields.prompt?.trim() || "");
      form.append("language", validLangId);
      form.append("ip_address", this._getRandomIp());
      form.append(fileKey, fileBuffer, {
        filename: fileName,
        contentType: "application/octet-stream"
      });
      const res = await axios.post(url, form, {
        headers: {
          ...form.getHeaders(),
          Accept: "application/json"
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      return res.data;
    } catch (e) {
      throw e;
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
  const api = new ApiService();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}