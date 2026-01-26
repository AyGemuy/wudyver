import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class NanoBanana {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      timeout: 12e4,
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "sec-ch-ua": '"Not)A;Brand";v="99", "Google Chrome";v="127"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        origin: "https://www.nanobana.net",
        referer: "https://www.nanobana.net/"
      }
    }));
    this.cfg = {
      base: "https://www.nanobana.net",
      mail: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`,
      models: {
        sora2: {
          type: "video",
          ep: {
            t2v: "/api/sora2/text-to-video/generate",
            i2v: "/api/sora2/image-to-video/generate",
            task_t2v: "/api/sora2/text-to-video/task",
            task_i2v: "/api/sora2/image-to-video/task"
          },
          req: {
            t2v: ["prompt"],
            i2v: ["image_urls"]
          }
        },
        nano: {
          type: "image",
          ep: {
            gen: "/api/nano-banana-pro/generate",
            task: "/api/nano-banana-pro/task"
          },
          req: {
            t2i: ["prompt"],
            i2i: ["prompt", "image_input"]
          }
        }
      }
    };
  }
  log(m, t = "i") {
    const ts = new Date().toLocaleTimeString();
    console.log(`[${ts}] ${t === "e" ? "❌" : t === "w" ? "⚠️" : "ℹ️"} ${m}`);
  }
  async imp(s) {
    if (!s) return;
    try {
      const d = JSON.parse(Buffer.from(s, "base64").toString());
      this.jar.removeAllCookiesSync();
      if (Array.isArray(d?.cookies)) {
        for (const c of d.cookies) {
          await this.jar.setCookie(c, this.cfg.base).catch(() => {});
        }
      }
    } catch (e) {
      this.log("Session import fail", "w");
    }
  }
  async exp() {
    try {
      const c = await this.jar.getCookies(this.cfg.base);
      return Buffer.from(JSON.stringify({
        cookies: c.map(x => x.toString())
      })).toString("base64");
    } catch {
      return null;
    }
  }
  parse(d) {
    if (!d || typeof d !== "object") return {};
    if ("data" in d && "code" in d) return d.data || {};
    if ("provider_raw" in d) return {
      ...d,
      ...d.data,
      ...d.provider_raw?.data || {}
    };
    return d;
  }
  chk(req, pay) {
    const mis = req.filter(k => {
      const v = pay[k];
      return v === undefined || v === null || v === "" || Array.isArray(v) && v.length === 0;
    });
    if (mis.length > 0) throw new Error(`Missing: ${mis.join(", ")}`);
  }
  async mkMail() {
    try {
      const r = await axios.get(`${this.cfg.mail}?action=create`);
      return r.data?.email;
    } catch {
      return null;
    }
  }
  async getMsg(e) {
    try {
      const r = await axios.get(`${this.cfg.mail}?action=message&email=${e}`);
      return r.data?.data || [];
    } catch {
      return [];
    }
  }
  async login() {
    try {
      this.log("Login...");
      const csrf = await this.client.get(`${this.cfg.base}/api/auth/csrf`);
      const tk = csrf?.data?.csrfToken;
      if (!tk) throw new Error("No CSRF");
      const em = await this.mkMail();
      if (!em) throw new Error("Mail fail");
      this.log(`Mail: ${em}`);
      await this.client.post(`${this.cfg.base}/api/auth/email/send`, {
        email: em
      });
      let cd = null;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const msg = await this.getMsg(em);
        if (msg?.[0]?.text_content) {
          cd = msg[0].text_content.match(/\b\d{6}\b/)?.[0];
          if (cd) break;
        }
      }
      if (!cd) throw new Error("OTP timeout");
      this.log(`OTP: ${cd}`);
      const f = new FormData();
      f.append("email", em);
      f.append("code", cd);
      f.append("csrfToken", tk);
      f.append("callbackUrl", `${this.cfg.base}/auth/signin`);
      f.append("json", "true");
      await this.client.post(`${this.cfg.base}/api/auth/signin/email-code?`, f, {
        headers: {
          ...f.getHeaders(),
          redirect: "false"
        }
      });
      const u = await this.client.post(`${this.cfg.base}/api/get-user-info`);
      return u?.data?.code === 0;
    } catch (e) {
      this.log(`Login err: ${e.message}`, "e");
      return false;
    }
  }
  async up(inp) {
    try {
      if (Array.isArray(inp)) {
        this.log(`Upload batch: ${inp.length} files`);
        const results = [];
        for (let i = 0; i < inp.length; i++) {
          try {
            this.log(`  [${i + 1}/${inp.length}] Uploading...`);
            const url = await this._upSingle(inp[i]);
            if (url) results.push(url);
          } catch (e) {
            this.log(`  [${i + 1}/${inp.length}] Failed: ${e.message}`, "w");
          }
        }
        return results.length > 0 ? results : null;
      }
      return await this._upSingle(inp);
    } catch (e) {
      this.log(`Upload err: ${e.message}`, "e");
      return null;
    }
  }
  async _upSingle(inp) {
    try {
      let buf, fn = `u_${Date.now()}.jpg`,
        ct = "image/jpeg";
      if (Buffer.isBuffer(inp)) {
        buf = inp;
      } else if (typeof inp === "string") {
        if (inp.startsWith("http")) {
          if (inp.includes("nanobana.net")) return inp;
          const r = await axios.get(inp, {
            responseType: "arraybuffer"
          });
          buf = Buffer.from(r.data);
          ct = r.headers["content-type"] || ct;
        } else {
          const m = inp.match(/^data:(.+);base64,(.+)$/);
          if (m) {
            ct = m[1];
            buf = Buffer.from(m[2], "base64");
          } else {
            buf = Buffer.from(inp, "base64");
          }
          fn = "u.png";
        }
      }
      if (!buf) throw new Error("Invalid input");
      const preRes = await this.client.post(`${this.cfg.base}/api/upload/presign-url`, {
        filename: fn,
        contentType: ct
      });
      const presign = preRes.data;
      if (!presign?.url || !presign?.fields) {
        throw new Error("No presign data");
      }
      const form = new FormData();
      Object.entries(presign.fields).forEach(([k, v]) => form.append(k, v));
      form.append("file", buf, {
        filename: fn,
        contentType: ct
      });
      await axios.post(presign.url, form, {
        headers: {
          ...form.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      const finalUrl = `${presign.url}/${presign.fields.key}`;
      this.log(`Uploaded: ${fn}`);
      return finalUrl;
    } catch (e) {
      this.log(`Single upload err: ${e.message}`, "e");
      return null;
    }
  }
  async generate({
    state,
    image,
    model,
    prompt,
    poll = false,
    ...rest
  }) {
    try {
      await this.imp(state);
      const u = await this.client.post(`${this.cfg.base}/api/get-user-info`).catch(() => ({
        data: {
          code: -1
        }
      }));
      if (u.data?.code !== 0) await this.login();
      const mk = (model || "").toLowerCase().includes("sora") ? "sora2" : "nano";
      const c = this.cfg.models[mk];
      const meta = {
        ts: Date.now(),
        mode: "unk",
        model: mk
      };
      let iurl = null;
      if (image) {
        const uploaded = await this.up(image);
        if (uploaded) {
          iurl = Array.isArray(uploaded) ? uploaded : [uploaded];
          this.log(`Ready: ${iurl.length} image(s)`);
        }
      }
      let url = "",
        pay = {};
      if (mk === "sora2") {
        if (iurl) {
          meta.mode = "i2v";
          url = `${this.cfg.base}${c.ep.i2v}`;
          pay = {
            prompt: prompt || "Animate",
            image_urls: iurl,
            aspect_ratio: rest.aspect_ratio || "landscape",
            n_frames: rest.n_frames || "15",
            remove_watermark: rest.remove_watermark ?? true
          };
          this.chk(c.req.i2v, pay);
        } else {
          meta.mode = "t2v";
          url = `${this.cfg.base}${c.ep.t2v}`;
          pay = {
            prompt: prompt,
            aspect_ratio: rest.aspect_ratio || "landscape",
            n_frames: rest.n_frames || "15",
            remove_watermark: rest.remove_watermark ?? true
          };
          this.chk(c.req.t2v, pay);
        }
      } else {
        url = `${this.cfg.base}${c.ep.gen}`;
        if (iurl) {
          meta.mode = "i2i";
          pay = {
            prompt: prompt || "Enhance",
            image_input: iurl,
            output_format: rest.output_format || "png",
            resolution: rest.resolution || "1K",
            aspect_ratio: rest.aspect_ratio || "1:1",
            ...rest
          };
          this.chk(c.req.i2i, pay);
        } else {
          meta.mode = "t2i";
          pay = {
            prompt: prompt,
            output_format: rest.output_format || "png",
            resolution: rest.resolution || "1K",
            aspect_ratio: rest.aspect_ratio || "1:1",
            ...rest
          };
          this.chk(c.req.t2i, pay);
        }
      }
      this.log(`Gen [${meta.mode}] ${mk}`);
      const {
        data
      } = await this.client.post(url, pay);
      const res = this.parse(data);
      res.taskId = res.taskId || res.task_id;
      res._mode = meta.mode;
      const initRes = {
        ...res,
        meta: meta,
        state: await this.exp()
      };
      if (poll && res.taskId) {
        this.log("Auto polling enabled");
        return await this._poll(initRes);
      }
      return initRes;
    } catch (e) {
      this.log(`Gen err: ${e.message}`, "e");
      return {
        status: "fail",
        error: e.message,
        state: await this.exp()
      };
    }
  }
  async _poll(init) {
    try {
      if (!init.taskId) {
        this.log("No taskId to poll", "e");
        return init;
      }
      this.log(`Polling task: ${init.taskId}`);
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const s = await this.status({
          state: init.state,
          task_id: init.taskId,
          model: init.meta.model,
          mode: init.meta.mode
        });
        const p = s.progress ? ` ${s.progress}%` : "";
        this.log(`[${i + 1}/60] ${s.status}${p}`);
        if (s.status === "success" || s.status === "completed") {
          this.log("Poll complete ✅");
          return s;
        }
        if (s.status === "failed" || s.status === "error") {
          this.log(`Poll failed: ${s.error}`, "e");
          return s;
        }
      }
      this.log("Poll timeout", "w");
      return {
        ...init,
        status: "timeout",
        error: "Polling timeout after 5 minutes"
      };
    } catch (e) {
      this.log(`Poll err: ${e.message}`, "e");
      return {
        ...init,
        status: "error",
        error: e.message
      };
    }
  }
  async status({
    state,
    task_id,
    model,
    mode
  }) {
    try {
      await this.imp(state);
      if (!task_id) throw new Error("task_id required");
      const mk = (model || "").toLowerCase().includes("sora") ? "sora2" : "nano";
      const c = this.cfg.models[mk];
      let url = "";
      if (mk === "sora2") {
        const isT2V = mode === "t2v";
        url = isT2V ? `${this.cfg.base}${c.ep.task_t2v}/${task_id}?save=1` : `${this.cfg.base}${c.ep.task_i2v}/${task_id}?save=1`;
      } else {
        url = `${this.cfg.base}${c.ep.task}/${task_id}?save=1`;
      }
      this.log(`Stat check: ${task_id.slice(0, 8)}...`);
      const {
        data
      } = await this.client.get(url);
      const res = this.parse(data);
      if (res.status === "failed" || res.failCode) {
        res.status = "failed";
        res.error = res.failMsg || res.error || res.message || "Fail";
      }
      if (res.status === "completed" || res.status === "success") {
        const urls = [];
        if (Array.isArray(res.savedFiles)) {
          urls.push(...res.savedFiles.map(f => f.publicUrl).filter(Boolean));
        }
        if (Array.isArray(res.resultUrls)) {
          urls.push(...res.resultUrls.filter(Boolean));
        }
        if (Array.isArray(res.result?.images)) {
          urls.push(...res.result.images.map(img => img.url).filter(Boolean));
        }
        if (res.provider_raw?.data?.resultUrl) {
          urls.push(res.provider_raw.data.resultUrl);
        }
        if (res.resultUrl) urls.push(res.resultUrl);
        if (res.url) urls.push(res.url);
        const unique = [...new Set(urls)];
        if (unique.length > 0) {
          res.urls = unique;
          res.url = unique[0];
          this.log(`Found ${unique.length} result(s)`);
        }
      }
      return {
        ...res,
        state: await this.exp()
      };
    } catch (e) {
      this.log(`Stat err: ${e.message}`, "e");
      return {
        status: "error",
        error: e.message,
        state: await this.exp()
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
      actions: ["generate", "status"],
      examples: {
        text_to_image: {
          action: "generate",
          prompt: "Beautiful sunset",
          model: "nano"
        },
        text_to_video: {
          action: "generate",
          prompt: "Cat dancing",
          model: "sora"
        },
        status: {
          action: "status",
          task_id: "...",
          state: "...",
          mode: "t2i"
        }
      },
      note: "The 'generate' action auto-detects T2I/I2I/T2V/I2V based on model and image parameter"
    });
  }
  const api = new NanoBanana();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'",
            available_models: api.listModels(),
            example: {
              action: "generate",
              prompt: "Your prompt here",
              model: "nano"
            }
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.state || !params.task_id) {
          return res.status(400).json({
            error: "Parameter 'state' dan 'task_id' wajib diisi untuk action 'status'",
            example: {
              action: "status",
              state: "xxxxxxxxx",
              task_id: "xxxxxxxxx",
              mode: "t2i"
            }
          });
        }
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "status"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}