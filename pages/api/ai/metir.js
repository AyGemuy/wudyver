import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
const CFG = {
  KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.sDEYG1pJgaORRCuRO-AAwEEfSBGJ_iNDpMQvgIClvGQ",
  AUTH: "https://supabase.metirai.com/auth/v1",
  CHAT: "https://metir-chat.fly.dev/api/chat",
  MAIL: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`
};
class MetirAI {
  constructor() {
    this.sess = {
      tok: null,
      ref: null,
      usr: null
    };
    this.api = axios.create({
      headers: {
        "Content-Type": "application/json",
        apikey: CFG.KEY
      },
      validateStatus: () => true
    });
  }
  _id() {
    return crypto.randomUUID();
  }
  _pass(l = 12) {
    return crypto.randomBytes(l).toString("hex") + "A1!";
  }
  _wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  async _getMail() {
    try {
      const {
        data
      } = await axios.get(`${CFG.MAIL}?action=create`);
      return data?.email || null;
    } catch (e) {
      console.error("Mail Err:", e.message);
      return null;
    }
  }
  async _getLink(email) {
    process.stdout.write("⏳ Waiting OTP");
    for (let i = 0; i < 60; i++) {
      try {
        const {
          data
        } = await axios.get(`${CFG.MAIL}?action=message&email=${email}`);
        const content = data?.data?.[0]?.text_content || data?.data?.[0]?.html_content || "";
        const match = content.match(/https:\/\/supabase\.metirai\.com\/auth\/v1\/verify\?token=[^"\s&]+&type=signup[^"\s]*/);
        if (match) {
          console.log(" -> OK");
          return match[0];
        }
      } catch (e) {}
      process.stdout.write(".");
      await this._wait(3e3);
    }
    return null;
  }
  async reg(email, password) {
    try {
      const {
        status
      } = await this.api.post(`${CFG.AUTH}/signup`, {
        email: email,
        password: password,
        data: {
          full_name: `User ${crypto.randomBytes(2).toString("hex")}`
        }
      });
      return status === 200 || status === 201;
    } catch (e) {
      console.error("Reg Err:", e.message);
      return false;
    }
  }
  async log(email, password) {
    try {
      const {
        data,
        status
      } = await this.api.post(`${CFG.AUTH}/token?grant_type=password`, {
        email: email,
        password: password
      });
      if (status === 200) {
        this.sess = {
          tok: data.access_token,
          ref: data.refresh_token,
          usr: data.user
        };
        return true;
      }
    } catch (e) {
      console.error("Log Err:", e.message);
    }
    return false;
  }
  async send(msg, sid, opts = {}) {
    if (!this.sess.tok) throw new Error("No Auth");
    const cfg = {
      model: "metir-model",
      stream: true,
      ...opts
    };
    try {
      const isStream = cfg.stream === true;
      const {
        data
      } = await axios({
        method: "post",
        url: CFG.CHAT,
        responseType: isStream ? "stream" : "json",
        headers: {
          ...this.api.defaults.headers,
          Authorization: `Bearer ${this.sess.tok}`
        },
        data: {
          message: msg,
          session_id: sid,
          ...cfg
        }
      });
      if (!isStream) {
        console.log("✅ Non-stream response received");
        return {
          txt: data,
          think: null,
          srcs: []
        };
      }
      return new Promise(resolve => {
        let result = {};
        process.stdout.write("🤖 ");
        data.on("data", c => {
          const lines = c.toString().split("\n");
          for (const l of lines) {
            const idx = l.indexOf(":");
            if (idx === -1) continue;
            try {
              const d = JSON.parse(l.substring(idx + 1));
              if (typeof d === "string") {
                result.text = (result.text || "") + d;
                process.stdout.write(d);
              } else if (typeof d === "object" && d !== null) {
                const item = Array.isArray(d) ? d[0] : d;
                Object.keys(item).forEach(key => {
                  if (typeof item[key] === "string") {
                    result[key] = (result[key] || "") + item[key];
                  } else {
                    result[key] = item[key];
                  }
                });
              }
            } catch (e) {}
          }
        });
        data.on("end", () => {
          console.log();
          resolve(result);
        });
      });
    } catch (e) {
      console.error("Chat Err:", e.message);
      return {
        txt: null,
        error: e.message
      };
    }
  }
  async chat({
    email,
    pass,
    prompt,
    session_id,
    ...rest
  }) {
    let em = email,
      ps = pass,
      isNew = false;
    try {
      if (!em || !ps) {
        console.log("🔄 Gen Creds...");
        em = await this._getMail();
        ps = this._pass();
        if (!em) throw new Error("Mail Fail");
        isNew = true;
        console.log(`👤 ${em}`);
        await this.reg(em, ps);
        const link = await this._getLink(em);
        if (!link) throw new Error("Timeout OTP");
        try {
          await axios.get(link);
        } catch (e) {}
        await this._wait(1e3);
      }
      console.log("🔐 Logging in...");
      if (!await this.log(em, ps)) throw new Error("Log Fail");
      const sid = session_id || this._id();
      console.log(`📤 "${prompt}"`);
      const res = await this.send(prompt, sid, rest);
      return {
        ...res,
        email: em,
        pass: ps,
        is_new: isNew
      };
    } catch (e) {
      return {
        error: e.message,
        email: em,
        pass: ps
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
  const api = new MetirAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}