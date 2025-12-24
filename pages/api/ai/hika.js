import axios from "axios";
import crypto from "crypto";
class HikaAPI {
  constructor() {
    this.baseURL = "https://api.hika.fyi/api/";
    this.endpoints = {
      kbase: "kbase/web",
      advanced: "kbase/web/advanced",
      mindmap: "answer/transform/mindmap",
      keywords: "answer/transform/keywords"
    };
    this.headers = {
      "Content-Type": "application/json",
      Origin: "https://hika.fyi",
      Referer: "https://hika.fyi/",
      "User-Agent": "Postify/1.0.0"
    };
    this.types = ["chat", "advanced", "mindmap", "keywords"];
  }
  async generateId() {
    const uid = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const hashId = crypto.createHash("sha256").update(`#${uid}*`).digest("hex");
    return {
      uid: uid,
      hashId: hashId
    };
  }
  checkPayload(payload, fields) {
    return fields.filter(field => !payload[field] || Array.isArray(payload[field]) && !payload[field].length);
  }
  parse(response) {
    let result = {
      text: ""
    };
    if (typeof response.data === "string") {
      response.data.split("\n").forEach(line => {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) result.text += data.chunk;
            if (data.topic_id) result.topicId = data.topic_id;
            if (data.references) result.references = data.references;
            if (data.response_id) result.rid = data.response_id;
          } catch (e) {}
        }
      });
    }
    return result;
  }
  async request(options) {
    if (!options.type || !this.types.includes(options.type)) {
      return {
        status: false,
        code: 400,
        type: "error",
        message: "Tipe tidak valid. Gunakan salah satu dari: " + this.types.join(", ")
      };
    }
    try {
      const {
        uid,
        hashId
      } = await this.generateId();
      const headers = {
        ...this.headers,
        "x-hika": hashId,
        "x-uid": uid
      };
      const handlers = {
        chat: async () => {
          const payload = {
            keyword: options.keyword,
            language: options.language || "id",
            stream: true
          };
          const missingFields = this.checkPayload(payload, ["keyword"]);
          if (missingFields.length) {
            return {
              status: false,
              code: 400,
              type: options.type,
              message: "Paramenter wajib belum lengkap.",
              missing: missingFields
            };
          }
          if (payload.keyword.length < 2) {
            return {
              status: false,
              code: 400,
              type: options.type,
              message: "Keyword minimal harus 2 karakter."
            };
          }
          const response = await axios.post(`${this.baseURL}${this.endpoints.kbase}`, payload, {
            headers: headers
          });
          if (!response.data) return {
            status: false,
            code: 404,
            message: "Konten tidak ditemukan."
          };
          const result = this.parse(response);
          return {
            status: true,
            code: 200,
            data: {
              type: options.type,
              text: result.text
            }
          };
        },
        mindmap: async () => {
          const payload = {
            response_id: options.rid,
            keywords: options.keywords,
            language: options.language || "id",
            stream: true
          };
          const missingFields = this.checkPayload(payload, ["response_id", "keywords"]);
          if (missingFields.length) {
            return {
              status: false,
              code: 400,
              type: options.type,
              message: "Paramenter wajib belum lengkap.",
              missing: missingFields
            };
          }
          const response = await axios.post(`${this.baseURL}${this.endpoints.mindmap}`, payload, {
            headers: headers
          });
          const result = this.parse(response);
          return {
            status: true,
            code: 200,
            data: {
              type: options.type,
              text: result.text
            }
          };
        },
        keywords: async () => {
          const payload = {
            response_id: options.rid,
            language: options.language || "id",
            stream: true
          };
          const missingFields = this.checkPayload(payload, ["response_id"]);
          if (missingFields.length) {
            return {
              status: false,
              code: 400,
              type: options.type,
              message: "Paramenter wajib belum lengkap.",
              missing: missingFields
            };
          }
          const response = await axios.post(`${this.baseURL}${this.endpoints.keywords}`, payload, {
            headers: headers
          });
          const result = this.parse(response);
          return {
            status: true,
            code: 200,
            data: {
              type: options.type,
              text: result.text
            }
          };
        }
      };
      handlers.advanced = handlers.chat;
      return await handlers[options.type]();
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        type: options.type,
        message: error.response?.data?.message || "Terjadi kesalahan, coba lagi nanti."
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const chatbot = new HikaAPI();
    const response = await chatbot.chat(params);
    return response ? res.json(response) : res.status(500).json({
      error: response
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}