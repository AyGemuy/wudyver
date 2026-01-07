import axios from "axios";
import FormData from "form-data";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
class NanoBananas {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.base = "https://nanobananas.ai";
    this.session = null;
    this.email = null;
  }
  log(msg) {
    console.log(`[NanoBananas] ${msg}`);
  }
  enc(cookies) {
    return Buffer.from(JSON.stringify(cookies)).toString("base64");
  }
  dec(b64) {
    return JSON.parse(Buffer.from(b64, "base64").toString());
  }
  head(session) {
    const cookies = session ? this.dec(session) : this.session;
    const str = Object.entries(cookies || {}).map(([k, v]) => `${k}=${v}`).join("; ");
    return {
      cookie: str,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
    };
  }
  async mail() {
    try {
      this.log("Creating email...");
      const {
        data
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      this.email = data?.email;
      this.log(`Email: ${this.email}`);
      return this.email;
    } catch (e) {
      this.log(`Mail error: ${e.message}`);
      throw e;
    }
  }
  async otp(max = 60) {
    try {
      this.log("Waiting OTP...");
      for (let i = 0; i < max; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const {
          data
        } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${this.email}`);
        const html = data?.data?.[0]?.html_content;
        if (html) {
          const $ = cheerio.load(html);
          const code = $('div[style*="font-size: 36px"]').text().trim();
          if (code) {
            this.log(`OTP: ${code}`);
            return code;
          }
        }
      }
      throw new Error("OTP timeout");
    } catch (e) {
      this.log(`OTP error: ${e.message}`);
      throw e;
    }
  }
  async cap() {
    try {
      this.log("Solving captcha...");
      const {
        data
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`, {
        params: {
          url: "https://nanobananas.ai/ai-video/sora-2",
          sitekey: "0x4AAAAAAB6cgGw5VlNTe3pq"
        }
      });
      this.log("Captcha solved");
      return data?.token;
    } catch (e) {
      this.log(`Captcha error: ${e.message}`);
      throw e;
    }
  }
  async login() {
    try {
      const mail = this.email || await this.mail();
      const cap = await this.cap();
      this.log("Sending verification...");
      await this.client.post(`${this.base}/api/auth/send-verification`, {
        email: mail,
        turnstileToken: cap
      }, {
        headers: {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
      });
      const code = await this.otp();
      this.log("Getting CSRF...");
      const {
        data: csrf
      } = await this.client.get(`${this.base}/api/auth/csrf`);
      this.log("Verifying code...");
      const body = new URLSearchParams({
        email: mail,
        verificationCode: code,
        redirect: "false",
        csrfToken: csrf?.csrfToken,
        callbackUrl: `${this.base}/ai-video/sora-2`
      });
      await this.client.post(`${this.base}/api/auth/callback/email-verification?`, body, {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-auth-return-redirect": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
      });
      this.log("Getting session token...");
      await this.client.get(`${this.base}/ai-video/sora-2`, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
      });
      const cookies = await this.jar.getCookies(this.base);
      this.session = cookies.reduce((o, c) => ({
        ...o,
        [c.key]: c.value
      }), {});
      const session = this.enc(this.session);
      this.log("Login success");
      return {
        session: session,
        email: mail
      };
    } catch (e) {
      this.log(`Login error: ${e.message}`);
      throw e;
    }
  }
  async buf(input) {
    try {
      if (Buffer.isBuffer(input)) return {
        type: "buffer",
        data: input
      };
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          this.log(`Downloading: ${input.substring(0, 50)}...`);
          const {
            data
          } = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return {
            type: "buffer",
            data: Buffer.from(data)
          };
        }
        if (input.startsWith("data:")) {
          const b64 = input.replace(/^data:image\/\w+;base64,/, "");
          return {
            type: "buffer",
            data: Buffer.from(b64, "base64")
          };
        }
        return {
          type: "buffer",
          data: Buffer.from(input, "base64")
        };
      }
      return {
        type: "buffer",
        data: input
      };
    } catch (e) {
      this.log(`Buffer error: ${e.message}`);
      throw e;
    }
  }
  async generate({
    prompt,
    media,
    poll = false,
    ...rest
  }) {
    try {
      let session = rest?.session;
      if (!session) {
        const login = await this.login();
        session = login.session;
      }
      this.log("Generating video...");
      const form = new FormData();
      form.append("mode", rest?.mode || "sora2");
      form.append("prompt", prompt);
      form.append("aspect_ratio", rest?.aspect_ratio || "16:9");
      form.append("resolution", rest?.resolution || "720p");
      form.append("duration", rest?.duration || 10);
      const files = media ? Array.isArray(media) ? media : [media] : [];
      for (const f of files) {
        const resolved = await this.buf(f);
        form.append("image_file", resolved.data, {
          filename: "image.jpg"
        });
      }
      const {
        data
      } = await axios.post(`${this.base}/api/video/generate`, form, {
        headers: {
          ...form.getHeaders(),
          ...this.head(session)
        }
      });
      this.log(`Task: ${data?.uuid}`);
      if (poll) {
        this.log("Polling enabled, checking status...");
        return await this.poll({
          session: session,
          task_id: data?.uuid
        });
      }
      return {
        ...data,
        session: session
      };
    } catch (e) {
      this.log(`Generate error: ${e.message}`);
      throw e;
    }
  }
  async status({
    session,
    task_id,
    ...rest
  }) {
    try {
      const sess = session || (this.session ? this.enc(this.session) : null);
      const tid = task_id || rest?.uuid;
      if (!tid) {
        this.log("Finding task in history...");
        const {
          data: hist
        } = await axios.get(`${this.base}/api/video/history`, {
          params: {
            page: 1,
            pageSize: 10,
            showAllTasks: false
          },
          headers: this.head(sess)
        });
        const t = hist?.data?.[0];
        if (!t) throw new Error("No task found");
        return {
          ...t,
          session: sess
        };
      }
      this.log(`Checking status: ${tid}`);
      const {
        data: hist
      } = await axios.get(`${this.base}/api/video/history`, {
        params: {
          page: 1,
          pageSize: 50,
          showAllTasks: true
        },
        headers: this.head(sess)
      });
      const task = hist?.data?.find(t => t?.uuid === tid || t?.external_task_id === tid);
      if (!task) throw new Error("Task not found");
      this.log(`Status: ${task?.status}`);
      return {
        ...task,
        session: sess
      };
    } catch (e) {
      this.log(`Status error: ${e.message}`);
      throw e;
    }
  }
  async poll({
    session,
    task_id,
    max = 120,
    delay = 3e3
  }) {
    try {
      this.log("Starting poll...");
      for (let i = 0; i < max; i++) {
        await new Promise(r => setTimeout(r, delay));
        const task = await this.status({
          session: session,
          task_id: task_id
        });
        if (task?.output_url || task?.video_url) {
          this.log("Video ready!");
          return task;
        }
        if (task?.error_message) {
          throw new Error(`Task failed: ${task.error_message}`);
        }
        const prog = task?.process_value || 0;
        this.log(`Progress: ${prog}% (${i + 1}/${max})`);
      }
      throw new Error("Poll timeout");
    } catch (e) {
      this.log(`Poll error: ${e.message}`);
      throw e;
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
      actions: ["generate", "status"]
    });
  }
  const api = new NanoBananas();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'",
            example: {
              action: "generate",
              prompt: "A futuristic car driving through neon city"
            }
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.task_id || !params.session) {
          return res.status(400).json({
            error: "Parameter 'task_id' dan 'session' wajib diisi untuk action 'status'",
            example: {
              action: "status",
              task_id: "xxxxxxxxx",
              session: "eyxxxxxxxxx"
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