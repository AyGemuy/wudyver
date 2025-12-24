import fetch from "node-fetch";
import crypto from "node:crypto";
class AiGen {
  constructor() {
    this.cfg = {
      base: "https://aiimagegenerator-yh5a.onrender.com",
      ep: {
        reg: "/api/auth/register/",
        login: "/api/auth/login/",
        gen: "/api/images/generate-async/",
        task: id => `/api/tasks/${id}/status`
      },
      def: {
        style: "AnimationBehavior",
        aspect_ratio: "1:1"
      },
      valid_ratios: ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"]
    };
    this.creds = null;
    this.token = null;
  }
  c() {
    const p = ["_iBe", "_MO", "_Sma", "_Mra"][crypto.getRandomValues(new Uint8Array(1))[0] % 4];
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 9e8 + 1e8;
    const e = Buffer.from(crypto.getRandomValues(new Uint8Array(8))).toString("hex") + "@tmp.ai";
    const pw = Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString("base64url").slice(0, 16);
    return {
      u: `${p}@${n}`,
      e: e,
      pw: pw
    };
  }
  async r() {
    try {
      this.creds = this.c();
      console.log("REGISTER →", this.creds.u);
      const res = await fetch(this.cfg.base + this.cfg.ep.reg, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Type": "application/vnd.grafeq",
          "User-Agent": "Dart/3.0 (dart:io)"
        },
        body: JSON.stringify({
          username: this.creds.u,
          email: this.creds.e,
          password: this.creds.pw,
          password2: this.creds.pw,
          uniqueIdentifier: `node-${crypto.randomUUID()}`,
          is_sandbox: false
        })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message ?? "register failed");
      console.log("REGISTER OK");
      return true;
    } catch (e) {
      console.log("REGISTER ERR →", e.message);
      throw e;
    }
  }
  async l() {
    if (this.token) return this.token;
    try {
      if (!this.creds) await this.r();
      console.log("LOGIN →", this.creds.u);
      const res = await fetch(this.cfg.base + this.cfg.ep.login, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "AiImageGen/1.0 (Flutter; Android)"
        },
        body: JSON.stringify({
          username: this.creds.u,
          password: this.creds.pw
        })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message ?? "login failed");
      this.token = d.access ?? d.tokens?.access;
      console.log("LOGIN OK");
      return this.token;
    } catch (e) {
      console.log("LOGIN ERR →", e.message);
      throw e;
    }
  }
  async generate({
    prompt,
    ...rest
  }) {
    const requestRatio = rest.aspect_ratio || this.cfg.def.aspect_ratio;
    if (!this.cfg.valid_ratios.includes(requestRatio)) {
      throw new Error(`Invalid aspect_ratio: "${requestRatio}". Allowed: ${this.cfg.valid_ratios.join(", ")}`);
    }
    try {
      await this.l();
      console.log("GENERATE →", prompt.slice(0, 60));
      const res = await fetch(this.cfg.base + this.cfg.ep.gen, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
          "User-Agent": "AiApp/2.1 (Flutter; Android)"
        },
        body: JSON.stringify({
          prompt: prompt,
          ...this.cfg.def,
          ...rest
        })
      });
      const task = await res.json();
      if (!task.task_id) throw new Error(task.message || "no task_id");
      console.log("TASK ID →", task.task_id);
      return await this.p(task.task_id);
    } catch (e) {
      console.log("GENERATE ERR →", e.message);
      throw e;
    }
  }
  async p(id) {
    const end = Date.now() + 6e4;
    while (Date.now() < end) {
      try {
        const res = await fetch(this.cfg.base + this.cfg.ep.task(id), {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        });
        const data = await res.json();
        console.log(`STATUS → ${data.status ?? "pending"}`);
        if (data.status === "completed") {
          console.log("SUCCESS!");
          return data;
        }
        if (data.status === "failed") {
          throw new Error(data.message ?? "task failed");
        }
        await new Promise(r => setTimeout(r, 3e3));
      } catch (e) {
        console.log("POLL ERR →", e.message);
        if (e.message.includes("task failed") || e.message.includes("Invalid aspect_ratio")) throw e;
      }
    }
    throw new Error("timeout processing task");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AiGen();
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