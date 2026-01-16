import axios from "axios";
import https from "https";
import crypto from "crypto";
import FormData from "form-data";
class AiImageEdit {
  constructor() {
    this.agent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false
    });
    this.cookieStore = {};
    this.validModes = ["text-to-image", "image-to-image", "image-edit"];
    this.client = axios.create({
      baseURL: "https://aiimageedit.org/api",
      httpsAgent: this.agent,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://aiimageedit.org",
        referer: "https://aiimageedit.org/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      }
    });
    this.setupInterceptors();
    this.user = null;
  }
  log(msg, type = "INFO") {
    const time = new Date().toLocaleTimeString("id-ID", {
      hour12: false
    });
    const colors = {
      INFO: "[36m",
      REQ: "[35m",
      RES: "[32m",
      ERROR: "[31m",
      WARN: "[33m",
      WAIT: "[34m"
    };
    const color = colors[type] || "[37m";
    console.log(`${color}[${time}] [${type}] ${msg}\x1b[0m`);
  }
  setupInterceptors() {
    this.client.interceptors.request.use(config => {
      this.log(`>> ${config.method.toUpperCase()} ${config.url}`, "REQ");
      if (config.data && !(config.data instanceof FormData)) {
        try {
          console.log("[90m%s[0m", JSON.stringify(config.data));
        } catch {}
      }
      const cookieString = Object.entries(this.cookieStore).map(([k, v]) => `${k}=${v}`).join("; ");
      if (cookieString) config.headers["cookie"] = cookieString;
      return config;
    });
    this.client.interceptors.response.use(response => {
      this.log(`<< ${response.status} ${response.config.url}`, "RES");
      if (response.data) {
        console.log("[90m%s[0m", JSON.stringify(response.data, null, 2));
      }
      const setCookie = response.headers["set-cookie"];
      if (Array.isArray(setCookie)) {
        setCookie.forEach(c => {
          const mainPart = c.split(";")[0];
          const idx = mainPart.indexOf("=");
          if (idx !== -1) {
            const key = mainPart.substring(0, idx).trim();
            const val = mainPart.substring(idx + 1).trim();
            this.cookieStore[key] = val;
          }
        });
      }
      return response;
    }, error => {
      if (error.response) {
        this.log(`<< ERROR ${error.response.status} ${error.config.url}`, "ERROR");
        console.log("[31m%s[0m", JSON.stringify(error.response.data, null, 2));
      }
      return Promise.reject(error);
    });
  }
  async resolve(img) {
    try {
      if (Buffer.isBuffer(img)) return {
        data: img,
        name: "buf.jpg"
      };
      if (typeof img === "string") {
        if (img.startsWith("http")) {
          const res = await axios.get(img, {
            responseType: "arraybuffer",
            httpsAgent: this.agent
          });
          return {
            data: Buffer.from(res.data),
            name: "url.jpg"
          };
        }
        if (img.startsWith("data:image")) return {
          data: Buffer.from(img.split(",")[1], "base64"),
          name: "b64.jpg"
        };
      }
      return null;
    } catch (e) {
      this.log(`Resolve Err: ${e.message}`, "WARN");
      return null;
    }
  }
  async checkCredits() {
    try {
      this.log("Checking Credits...", "INFO");
      const res = await this.client.post("/user/get-user-info", {}, {
        headers: {
          "content-length": "0"
        }
      });
      const cr = res?.data?.data?.credits?.remainingCredits;
      this.log(`Credits Remaining: ${cr}`, "INFO");
    } catch {}
  }
  async auth() {
    try {
      const email = `${crypto.randomBytes(8).toString("hex")}@emailhook.site`;
      const pwd = crypto.randomUUID();
      this.log(`Registering: ${email}`, "INFO");
      const res = await this.client.post("/auth/sign-up/email", {
        email: email,
        password: pwd,
        name: email
      });
      this.user = res?.data?.user;
      if (!this.user) throw new Error("Failed to get user data from auth");
      this.log("Auth OK. Cookies captured.", "SUCCESS");
      await this.checkCredits();
      return true;
    } catch (e) {
      throw e;
    }
  }
  async up(input) {
    try {
      const file = await this.resolve(input);
      if (!file) return null;
      const form = new FormData();
      form.append("files", file.data, file.name);
      this.log("Uploading...", "INFO");
      const res = await this.client.post("/storage/upload-image", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      return res?.data?.data?.urls?.[0];
    } catch (e) {
      throw e;
    }
  }
  async poll(id) {
    this.log(`Polling ID: ${id}`, "INFO");
    const max = 60;
    for (let i = 0; i < max; i++) {
      const res = await this.client.post("/ai/query", {
        taskId: id
      });
      const body = res?.data || {};
      const data = body.data || {};
      const status = body.code === 0 ? data.status || "unknown" : "waiting_server";
      this.log(`Attempt ${i + 1}/${max} -> Status: ${status}`, "WAIT");
      if (status === "success") {
        ["taskResult", "taskInfo", "options"].forEach(k => {
          if (typeof data[k] === "string") {
            try {
              data[k] = JSON.parse(data[k]);
            } catch {}
          }
        });
        return data;
      }
      if (["failed", "error"].includes(status)) throw new Error(`Task Failed on Server: ${status}`);
      await new Promise(r => setTimeout(r, 3e3));
    }
    throw new Error("Polling Timeout");
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      if (!this.user) {
        try {
          await this.auth();
        } catch (e) {
          return {
            status: false,
            message: `Auth Failed: ${e.message}`
          };
        }
      }
      const urls = [];
      const inputs = Array.isArray(imageUrl) ? imageUrl : imageUrl ? [imageUrl] : [];
      if (inputs.length) {
        for (const inp of inputs) {
          try {
            const u = await this.up(inp);
            if (u) urls.push(u);
          } catch (e) {
            return {
              status: false,
              message: `Upload Failed: ${e.message}`
            };
          }
        }
      }
      const mode = rest.mode || rest.scene || (urls.length ? "image-edit" : "text-to-image");
      if (!this.validModes.includes(mode)) {
        return {
          status: false,
          message: `Invalid Mode: ${mode}. Valid: ${this.validModes.join(", ")}`
        };
      }
      if (mode !== "text-to-image" && urls.length === 0) {
        return {
          status: false,
          message: `Mode '${mode}' requires image input.`
        };
      }
      const payload = {
        mediaType: "image",
        scene: mode,
        provider: rest.provider || "kie",
        model: rest.model || "google/nano-banana-edit",
        prompt: prompt,
        options: {
          generateType: mode,
          image_input: mode !== "text-to-image" ? urls : undefined,
          ...rest.options
        }
      };
      this.log(`Sending Job [${mode}]...`, "REQ");
      const taskRes = await this.client.post("/ai/generate", payload);
      const realId = taskRes?.data?.data?.id;
      if (!realId) {
        return {
          status: false,
          message: "No Task ID returned",
          debug: taskRes.data
        };
      }
      const resultData = await this.poll(realId);
      const finalUrl = resultData.outputImageUrl || resultData.taskResult?.resultUrls?.[0] || null;
      if (!finalUrl && !resultData.taskResult) {
        return {
          status: false,
          message: "Result URL not found in response",
          data: resultData
        };
      }
      return {
        status: true,
        message: "Success",
        result: finalUrl,
        mode: mode,
        credits: resultData.costCredits,
        data: resultData
      };
    } catch (e) {
      const errMsg = e.response?.data?.message || e.message;
      return {
        status: false,
        message: errMsg,
        error_code: e.response?.status || 500
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
  const api = new AiImageEdit();
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