import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class WormGPT {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        accept: "text/x-component"
      }
    }));
    this.wudy = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api`
    });
  }
  log(m) {
    console.log(`[${new Date().toISOString().split("T")[1].split(".")[0]}] [LOG] ${m}`);
  }
  async tkn(url) {
    try {
      this.log("Fetching CF Token...");
      const {
        data
      } = await this.wudy.get("/tools/cf-token", {
        params: {
          sitekey: "0x4AAAAAAADnOjc0PNeA8qVm",
          url: url,
          type: "turnstile-max"
        }
      });
      return data?.token || null;
    } catch (e) {
      this.log(`CF Token Error: ${e.message}`);
      return null;
    }
  }
  async mail() {
    try {
      this.log("Creating temp mail...");
      const {
        data
      } = await this.wudy.get("/mails/v9?action=create");
      return data?.email || null;
    } catch (e) {
      this.log(`Mail Error: ${e.message}`);
      return null;
    }
  }
  async otp(email) {
    try {
      this.log(`Waiting for link in ${email}...`);
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const {
          data
        } = await this.wudy.get(`/mails/v9?action=message&email=${email}`);
        const text = data?.data?.[0]?.text_content || "";
        const link = text.match(/https:\/\/chat\.wrmgpt\.com\/verify-email\?token=([^\s\r\n]+)/)?.[0];
        if (link) return link;
      }
      return null;
    } catch (e) {
      this.log(`OTP Error: ${e.message}`);
      return null;
    }
  }
  async register({
    ...rest
  }) {
    try {
      const email = await this.mail();
      const pass = rest?.password || email;
      const cfr = await this.tkn("https://chat.wrmgpt.com/register");
      if (!email || !cfr) throw new Error("Setup failed (Email/Token)");
      this.log("Registering account...");
      const fd = new FormData();
      fd.append("1_email", email);
      fd.append("1_password", pass);
      fd.append("1_confirmPassword", pass);
      fd.append("1_cf-turnstile-response", cfr);
      fd.append("0", '[{"status":"idle"},"$K1"]');
      await this.client.post("https://chat.wrmgpt.com/register", fd, {
        headers: {
          ...fd.getHeaders(),
          "next-action": "7f3763559faf160fb3f94b61abd9b79aa9ce5592dc"
        }
      });
      const vLink = await this.otp(email);
      if (!vLink) throw new Error("Verification link not received");
      const vTkn = new URL(vLink).searchParams.get("token");
      this.log("Verifying...");
      await this.client.post("https://chat.wrmgpt.com/verify-email", JSON.stringify([vTkn]), {
        headers: {
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "7f10481f66b1fdba9b128342ff16a95a63ddb47402"
        }
      });
      const cfl = await this.tkn("https://chat.wrmgpt.com/login");
      if (!cfl) throw new Error("Setup failed (Email/Token)");
      this.log("Logging in...");
      const lfd = new FormData();
      lfd.append("1_email", email);
      lfd.append("1_password", pass);
      lfd.append("1_cf-turnstile-response", cfl);
      lfd.append("0", '[{"status":"idle"},"$K1"]');
      await this.client.post("https://chat.wrmgpt.com/login", lfd, {
        headers: {
          ...lfd.getHeaders(),
          "next-action": "7f115ca3cd56a9e9b419072c971f3182eb007e4b9e"
        }
      });
      this.log("Creating key...");
      const {
        data
      } = await this.client.post("https://chat.wrmgpt.com/api/dashboard/api/keys", {
        name: "auto"
      });
      const key = data?.key?.plainKey;
      return {
        ...data,
        key: key,
        email: email,
        password: pass
      };
    } catch (e) {
      this.log(`Register Failed: ${e.message}`);
      return {
        error: true,
        message: e.message
      };
    }
  }
  async chat({
    key,
    prompt,
    messages = [],
    model,
    ...rest
  }) {
    try {
      const activeKey = key || (await this.register({}))?.key;
      if (!activeKey) throw new Error("API Key generation failed");
      const hist = messages.length ? messages : [];
      if (prompt) hist.push({
        role: "user",
        content: prompt
      });
      this.log(`Sending prompt to ${model || "wormgpt-v7"}...`);
      const {
        data
      } = await this.client.post("https://api.wrmgpt.com/v1/chat/completions", {
        model: model || "wormgpt-v7",
        messages: hist,
        temperature: rest?.temperature || .7,
        max_tokens: rest?.max_tokens || 1e3
      }, {
        headers: {
          Authorization: `Bearer ${activeKey}`
        }
      });
      return {
        ...data,
        key: activeKey,
        result: data?.choices?.[0]?.message?.content
      };
    } catch (e) {
      this.log(`Chat Failed: ${e.message}`);
      return {
        error: true,
        message: e.message
      };
    }
  }
  async models({
    key
  }) {
    try {
      const activeKey = key || (await this.register({}))?.key;
      const {
        data
      } = await this.client.get("https://api.wrmgpt.com/v1/models", {
        headers: {
          Authorization: `Bearer ${activeKey}`
        }
      });
      return {
        ...data,
        key: activeKey
      };
    } catch (e) {
      this.log(`Models error: ${e.message}`);
      return {
        error: true
      };
    }
  }
  async usage({
    key
  }) {
    try {
      const activeKey = key || (await this.register({}))?.key;
      const {
        data
      } = await this.client.get("https://api.wrmgpt.com/v1/usage", {
        headers: {
          Authorization: `Bearer ${activeKey}`
        }
      });
      return {
        ...data,
        key: activeKey
      };
    } catch (e) {
      this.log(`Usage error: ${e.message}`);
      return {
        error: true
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
      actions: ["register", "chat", "models", "usage"]
    });
  }
  const api = new WormGPT();
  try {
    let result;
    switch (action) {
      case "register":
        result = await api.register(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'"
          });
        }
        result = await api.chat(params);
        break;
      case "models":
        result = await api.models(params);
        break;
      case "usage":
        result = await api.usage(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["register", "chat", "models", "usage"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server"
    });
  }
}