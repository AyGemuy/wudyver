import axios from "axios";
import {
  randomUUID
} from "crypto";
import Encoder from "@/lib/encoder";
const BASE = "https://torial-website-backend-98830347369.us-central1.run.app/api";
const HEAD = {
  accept: "*/*",
  "content-type": "application/json",
  origin: "https://trytorial.com",
  referer: "https://trytorial.com/",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) Chrome/127 Mobile Safari/537.36"
};
class Torial {
  constructor() {
    this.ax = axios.create({
      baseURL: BASE,
      headers: HEAD,
      timeout: 6e4
    });
    this.token = null;
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
  async reg() {
    const ts = randomUUID();
    const payload = {
      email: `auto${ts}@mail.com`,
      client: `cli${ts}`,
      password: `Pass${ts}@mail.com`,
      numOfAvailableVideos: 1,
      clientId: ts
    };
    console.log("Register dengan:", payload.email);
    try {
      const r = await this.ax.post("/sign-up", payload);
      this.token = r.data.token ?? null;
      console.log("Token didapat");
      return {
        ...r.data,
        token: this.token
      };
    } catch (e) {
      console.error("Register gagal:", e.response?.data ?? e.message);
      throw e;
    }
  }
  async generate({
    prompt,
    model = "torial-2.5-test",
    ...rest
  }) {
    if (!this.token) await this.reg();
    console.log("Generate:", prompt.slice(0, 50) + (prompt.length > 50 ? "..." : ""));
    try {
      const r = await this.ax.post("/generate-video", {
        model: model,
        prompt: prompt,
        ...rest
      }, {
        headers: {
          authorization: `Bearer ${this.token}`
        }
      });
      const out = r.data;
      out.token = this.token;
      console.log("RequestId:", out.requestId);
      const taskId = await this.enc(out);
      console.log("Generation completed, task created");
      return {
        task_id: taskId
      };
    } catch (e) {
      console.error("Generate error:", e.response?.data ?? e.message);
      throw e;
    }
  }
  async status({
    task_id
  } = {}) {
    console.log("Checking task status...");
    if (!task_id) {
      throw new Error("Task ID is required");
    }
    const taskData = await this.dec(task_id);
    const {
      token,
      requestId
    } = taskData;
    if (!token || !requestId) {
      throw new Error("Invalid task data");
    }
    const t = token ?? this.token;
    if (!t) throw new Error("Token hilang");
    console.log("Cek status task:", requestId);
    try {
      const r = await this.ax.get(`/video-status/${requestId}`, {
        headers: {
          authorization: `Bearer ${t}`
        }
      });
      const out = r.data ?? {};
      out.token = t;
      console.log("Status saat ini:", out.status ?? "unknown");
      return out;
    } catch (e) {
      console.error("Status error:", e.response?.data ?? e.message);
      return {
        status: "error",
        message: e.message,
        token: t
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
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new Torial();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'generate', 'status'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}