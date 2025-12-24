import axios from "axios";
import {
  randomUUID
} from "crypto";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
const BASE = "https://lipsync.video/api";
class LipSync {
  constructor(opts = {}) {
    this.uid = opts.userId ?? randomUUID().replace(/-/g, "").slice(0, 32);
    this.cookie = opts.cookie ?? "i18n_redirected=id;";
    this.config = {
      baseURL: BASE,
      defaultPayload: {
        language: "en",
        subtitle_mode: 1,
        model: "v1",
        speaker: "English_Trustworth_Man",
        speed: 1,
        pitch: 0,
        volume: 5,
        emotion: "neutral",
        estimated_time: 170 + Math.random() * 10
      },
      endpoints: {
        talkingPhoto: {
          url: "tts-cartoon-lipsync/v2/job",
          type: "tts-talking-photo",
          referer: "https://lipsync.video/id/ai-talking-photo-generator",
          required: ["image", "text"],
          job_type: "talkingPhotoGeneratedTemplates"
        },
        baby: {
          url: "tts-cartoon-lipsync/v2/job",
          type: "tts-baby-lipsync",
          referer: "https://lipsync.video/id/ai-baby-podcast",
          required: ["image", "text"],
          job_type: "babyGeneratedTemplates"
        },
        cartoon: {
          url: "tts-cartoon-libs/v2/job",
          type: "tts-cartoon-lipsync",
          referer: "https://lipsync.video/id/ai-cartoon-lip-sync-generator",
          required: ["image", "text"],
          job_type: "cartoonGeneratedTemplates"
        },
        drawing: {
          url: "tts-cartoon-lipsync/v2/job",
          type: "tts-drawing-lipsync",
          referer: "https://lipsync.video/id/ai-drawing-lip-sync-generator",
          required: ["image", "text"],
          job_type: "drawingGeneratedTemplates"
        },
        video: {
          url: "tts-lipsync/v2/job",
          type: "tts-lipsync",
          referer: "https://lipsync.video/id",
          required: ["video", "text"],
          job_type: "videoGeneratedTemplates"
        }
      }
    };
    this.ax = axios.create({
      baseURL: this.config.baseURL,
      headers: this.buildHeader({
        referer: "https://lipsync.video/id/my-creations"
      })
    });
    console.log(`[init] user-id: ${this.uid}`);
  }
  buildHeader({
    referer,
    cookie,
    ...extra
  } = {}) {
    return {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://lipsync.video",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: referer ?? "https://lipsync.video/id/my-creations",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      cookie: cookie ?? this.cookie,
      "user-id": this.uid,
      ...extra,
      ...SpoofHead()
    };
  }
  getAvailableTypes() {
    return Object.keys(this.config.endpoints);
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  async generate({
    type,
    image,
    video,
    text,
    referer,
    cookie,
    ...rest
  }) {
    const availableTypes = this.getAvailableTypes();
    if (!type) {
      return {
        error: "type is required",
        available_types: availableTypes
      };
    }
    if (!availableTypes.includes(type)) {
      return {
        error: "invalid type",
        available_types: availableTypes
      };
    }
    const endpoint = this.config.endpoints[type];
    const missing = endpoint.required.filter(field => !eval(field));
    if (missing.length > 0) {
      return {
        error: `${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} required`
      };
    }
    const payload = {
      job_type: endpoint.job_type,
      ...this.config.defaultPayload,
      image: image,
      video: video,
      text: text,
      ...rest
    };
    const headers = this.buildHeader({
      referer: referer ?? endpoint.referer,
      cookie: cookie
    });
    console.log(`[generate] ${type} → POST ${endpoint.url}`);
    try {
      const res = await this.ax.post(endpoint.url, payload, {
        headers: headers
      });
      console.log(res.data);
      const job_id = res.data?.data?.job_id ?? res.data?.job_id;
      if (!job_id) {
        return {
          error: "failed to create job, no job_id returned"
        };
      }
      const task_id = await this.enc({
        job_id: job_id,
        type: endpoint.type
      });
      console.log(`[generate] task_id: ${task_id}`);
      return {
        task_id: task_id
      };
    } catch (e) {
      console.log("[generate] fail:", e.response?.data ?? e.message);
      return {
        error: e.response?.data?.message || "request failed"
      };
    }
  }
  async status({
    task_id,
    referer,
    cookie,
    ...rest
  }) {
    if (!task_id) {
      return {
        error: "task_id is required"
      };
    }
    let payload;
    try {
      payload = await this.dec(task_id);
    } catch (e) {
      return {
        error: "invalid task_id: decryption failed"
      };
    }
    const {
      job_id,
      type
    } = payload;
    if (!job_id || !type) {
      return {
        error: "invalid task_id: missing job_id or type"
      };
    }
    const headers = this.buildHeader({
      referer: referer ?? "https://lipsync.video/id/my-creations",
      cookie: cookie
    });
    console.log(`[status] query ${job_id} (${type})`);
    try {
      const res = await this.ax.post("/workflow/query", {
        jobs: [{
          id: job_id,
          type: type
        }],
        ...rest
      }, {
        headers: headers
      });
      console.log(res.data);
      return res.data ?? {
        status: "unknown",
        progress: 0
      };
    } catch (e) {
      console.log("[status] fail:", e.response?.data ?? e.message);
      return {
        error: e.response?.data?.message || "query failed"
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
      error: "action is required",
      available_actions: ["create", "status"]
    });
  }
  const api = new LipSync();
  try {
    let result;
    switch (action) {
      case "create":
        result = await api.generate(params);
        break;
      case "status":
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: "invalid action",
          available_actions: ["create", "status"]
        });
    }
    if (result?.error) {
      const statusCode = result.error.includes("required") || result.error.includes("invalid") ? 400 : 500;
      return res.status(statusCode).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("[API Error]", error.message);
    return res.status(500).json({
      error: error.message || "internal server error"
    });
  }
}