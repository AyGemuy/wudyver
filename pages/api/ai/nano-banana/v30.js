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
    this.cfg = {
      base: "https://nanobananapro.com",
      api: "https://nanobananapro.com/api",
      mail: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Origin: "https://nanobananapro.com",
        Referer: "https://nanobananapro.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      },
      endpoints: {
        csrf: "/auth/csrf",
        login: "/auth/callback/credentials?",
        session: "/auth/session",
        regCode: "/user/send-verification-code",
        reg: "/user/register",
        user: "/user",
        claim: "/user/assign-user-credits",
        upload: "/upload-file",
        genTask: "/generate/task-generate",
        genCheck: "/generate/task-check"
      },
      poll: {
        delay: 3e3,
        max: 60
      },
      models: ["Nano-Banana-Pro", "Nano-Banana"],
      ratios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "21:9"],
      defaultPayload: {
        isPrivate: false,
        isUploadingFile: false,
        imageQuality: ""
      }
    };
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      baseURL: this.cfg.api,
      headers: this.cfg.headers
    }));
  }
  log(msg) {
    console.log(`[NanoBanana] ${msg}`);
  }
  async wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  async mail(action, email = null) {
    try {
      const url = action === "create" ? `${this.cfg.mail}?action=create` : `${this.cfg.mail}?action=message&email=${email}`;
      const {
        data
      } = await axios.get(url);
      if (action === "create") {
        this.log(`Mail: ${data?.email}`);
        return data?.email;
      }
      if (action === "otp") {
        const msgs = data?.data || [];
        const content = msgs[0]?.text_content || msgs[0]?.body || "";
        return content.match(/\b\d{6}\b/)?.[0] || null;
      }
    } catch (e) {
      this.log(`Mail Err: ${e.message}`);
      return null;
    }
  }
  async ensure(tokenBase64) {
    try {
      if (tokenBase64) {
        this.log("Restoring session...");
        const serialized = Buffer.from(tokenBase64, "base64").toString("utf8");
        this.jar = CookieJar.deserializeSync(JSON.parse(serialized));
        this.client.defaults.jar = this.jar;
        return {
          email: null,
          isNew: false
        };
      }
      this.log("Registering...");
      const email = await this.mail("create");
      if (!email) throw new Error("No Email");
      await this.client.post(this.cfg.endpoints.regCode, {
        email: email
      });
      this.log("OTP Sent");
      let otp = null,
        i = 0;
      const {
        delay,
        max
      } = this.cfg.poll;
      while (!otp && i++ < max) {
        await this.wait(delay);
        otp = await this.mail("otp", email);
      }
      if (!otp) throw new Error("OTP Timeout");
      await this.client.post(this.cfg.endpoints.reg, {
        email: email,
        password: email,
        code: otp
      });
      const {
        data: c
      } = await this.client.get(this.cfg.endpoints.csrf);
      const csrfToken = c?.csrfToken;
      if (!csrfToken) throw new Error("No CSRF");
      const params = new URLSearchParams({
        email: email,
        password: email,
        csrfToken: csrfToken,
        callbackUrl: this.cfg.base,
        json: "true"
      });
      await this.client.post(this.cfg.endpoints.login, params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      await this.client.get(this.cfg.endpoints.session);
      return {
        email: email,
        isNew: true
      };
    } catch (e) {
      throw e;
    }
  }
  async claim(email) {
    try {
      if (!email) return;
      const {
        data: user
      } = await this.client.get(this.cfg.endpoints.user, {
        params: {
          email: email,
          t: Date.now()
        }
      });
      if ((user?.data?.available_credits || 0) < 1) {
        this.log("Claiming credits...");
        await this.client.post(this.cfg.endpoints.claim, {});
      }
    } catch (e) {
      this.log(`Claim Warn: ${e.message}`);
    }
  }
  async up(input) {
    try {
      let buf;
      if (Buffer.isBuffer(input)) buf = input;
      else if (typeof input === "string" && input.startsWith("http")) {
        buf = (await axios.get(input, {
          responseType: "arraybuffer"
        })).data;
      } else {
        buf = Buffer.from(input, "base64");
      }
      const form = new FormData();
      form.append("file", buf, {
        filename: `i${Date.now()}.jpg`,
        contentType: "image/jpeg"
      });
      const {
        data
      } = await this.client.post(this.cfg.endpoints.upload, form, {
        headers: form.getHeaders()
      });
      return data?.data?.url;
    } catch (e) {
      this.log(`Upload Err: ${e.message}`);
      return null;
    }
  }
  async generate({
    token,
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      const auth = await this.ensure(token);
      if (auth.isNew) await this.claim(auth.email);
      const newToken = Buffer.from(JSON.stringify(this.jar.serializeSync())).toString("base64");
      let model = rest.model || this.cfg.models[0];
      if (!this.cfg.models.includes(model)) {
        this.log(`Warn: Model '${model}' invalid. Using '${this.cfg.models[0]}'`);
        model = this.cfg.models[0];
      }
      let ratio = rest.ratio || this.cfg.ratios[0];
      if (!this.cfg.ratios.includes(ratio)) {
        this.log(`Warn: Ratio '${ratio}' invalid. Using '${this.cfg.ratios[0]}'`);
        ratio = this.cfg.ratios[0];
      }
      const finalImages = [];
      if (imageUrl) {
        const list = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        this.log(`Processing ${list.length} images...`);
        for (const img of list) {
          if (!img) continue;
          const url = await this.up(img);
          if (url) {
            this.log(`Uploaded: ${url}`);
            finalImages.push(url);
          }
        }
      }
      const type = finalImages.length ? "image-edit-pro" : "text-to-image";
      const payload = {
        ...this.cfg.defaultPayload,
        promptStr: prompt,
        aspectRatio: ratio,
        ...type === "image-edit-pro" ? {
          aiModel: model,
          images: finalImages
        } : {}
      };
      const form = new FormData();
      form.append("type", type);
      form.append("payload", JSON.stringify(payload));
      this.log(`Generating (${type})...`);
      const {
        data: task
      } = await this.client.post(this.cfg.endpoints.genTask, form, {
        headers: form.getHeaders()
      });
      const taskId = task?.data?.taskId;
      if (!taskId) throw new Error("No Task ID");
      let res = null,
        done = false,
        i = 0;
      const {
        delay,
        max
      } = this.cfg.poll;
      this.log(`Polling ${taskId}...`);
      while (!done && i < max) {
        await this.wait(delay);
        i++;
        const {
          data: check
        } = await this.client.get(this.cfg.endpoints.genCheck, {
          params: {
            taskId: taskId
          }
        });
        const status = check?.data?.status;
        process.stdout.write(`\r[NanoBanana] Status: ${status} (${i}/${max})`);
        if (status === "COMPLETED") {
          res = check?.data;
          done = true;
        } else if (status === "FAILED") throw new Error("Generation Failed");
      }
      console.log("");
      if (!res) throw new Error("Timeout");
      return {
        result: res?.generated_file_url,
        token: newToken,
        prompt: res?.prompt,
        model: model,
        ratio: ratio,
        info: res
      };
    } catch (e) {
      this.log(`Err: ${e.message}`);
      return {
        error: e.message,
        token: token || null
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
  const api = new NanoBanana();
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