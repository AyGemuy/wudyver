import axios from "axios";
import crypto from "crypto";
import qs from "qs";
class ToolbazAI {
  constructor() {
    this.client = axios.create({
      withCredentials: true,
      headers: {
        "user-agent": `Mozilla/5.0 (Linux; Android 10)`,
        accept: "*/*",
        "accept-language": Intl.DateTimeFormat().resolvedOptions().locale || "id-ID",
        "cache-control": "no-cache",
        connection: "keep-alive",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://toolbaz.com",
        pragma: "no-cache",
        referer: "https://toolbaz.com/",
        "sec-fetch-mode": "cors"
      }
    });
  }
  randomString(length) {
    return Array.from({
      length: length
    }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 62))).join("");
  }
  generateToken() {
    const payload = {
      bR6wF: {
        nV5kP: "Mozilla/5.0 (Linux; Android 10)",
        lQ9jX: Intl.DateTimeFormat().resolvedOptions().locale || "id-ID",
        sD2zR: "431x958",
        tY4hL: Intl.DateTimeFormat().resolvedOptions().timeZone,
        pL8mC: "Linux armv81",
        cQ3vD: new Date().getFullYear(),
        hK7jN: new Date().getHours()
      },
      uT4bX: {
        mM9wZ: [],
        kP8jY: []
      },
      tuTcS: Math.floor(Date.now() / 1e3),
      tDfxy: null,
      RtyJt: crypto.randomUUID()
    };
    return `d8TW0v${Buffer.from(JSON.stringify(payload)).toString("base64")}`;
  }
  async getAuth() {
    try {
      const session_id = this.randomString(36);
      const token = this.generateToken();
      const {
        data
      } = await this.client.post("https://data.toolbaz.com/token.php", qs.stringify({
        session_id: session_id,
        token: token
      }));
      return data.success ? {
        token: data.token,
        session_id: session_id
      } : null;
    } catch {
      return null;
    }
  }
  async chat({
    prompt,
    model = "gemini-2.0-flash"
  }) {
    const auth = await this.getAuth();
    if (!auth) return null;
    try {
      const {
        data
      } = await this.client.post("https://data.toolbaz.com/writing.php", qs.stringify({
        text: prompt,
        capcha: auth.token,
        model: model,
        session_id: auth.session_id
      }));
      return data;
    } catch {
      return null;
    }
  }
  models() {
    return [{
      label: "By Google",
      models: [{
        value: "gemini-2.0-flash-thinking",
        title: "Quality Index - 83, Speed - 110 W/s, Longer output",
        label: "G-2.0-F-Thinking 🆕"
      }, {
        value: "gemini-2.0-flash",
        title: "Quality Index - 82, Speed - 130 W/s, Longer output",
        label: "Gemini-2.0-Flash 🆕"
      }, {
        value: "gemini-1.5-flash",
        title: "Quality Index - 72, Speed - 120 W/s",
        label: "Gemini-1.5-Flash"
      }]
    }, {
      label: "By OpenAI",
      models: [{
        value: "gpt-4o-latest",
        title: "Quality Index - 80, Speed - 89 W/s, Longer output",
        label: "GPT-4o (latest)🆕"
      }, {
        value: "o1-mini",
        title: "Quality Index - 77, Speed - 60 W/s, Longer output",
        label: "O1-Mini"
      }, {
        value: "gpt-4o",
        title: "Quality Index - 73, Speed - 75 W/s",
        label: "GPT-4o"
      }]
    }, {
      label: "By DeepSeek",
      models: [{
        value: "deepseek-r1",
        title: "",
        label: "Deepseek-R1-Distill🆕"
      }]
    }, {
      label: "By Facebook (Meta)",
      models: [{
        value: "Llama-3.3-70B",
        title: "Quality Index - 74, Speed - 135 W/s, Longer output",
        label: "Llama-3.3 (70B) 🆕"
      }, {
        value: "Llama-3.1-405B",
        title: "Quality Index - 73",
        label: "Llama-3.1 (405B)"
      }, {
        value: "Llama-3.1-70B",
        title: "Quality Index - 65, Speed - 210 W/s, Longer output, Plain Text",
        label: "Llama-3.1 (70B)"
      }]
    }, {
      label: "By Alibaba",
      models: [{
        value: "Qwen2.5-72B",
        title: "Quality Index - 79, Speed - 70 W/s, Longer output",
        label: "Qwen2.5 (72B) 🆕"
      }, {
        value: "Qwen2-72B",
        title: "Quality Index - 69",
        label: "Qwen2 (72B)"
      }]
    }, {
      label: "By xAI (Twitter)",
      models: [{
        value: "grok-2-1212",
        title: "Quality Index - 73",
        label: "Grok-2 🆕"
      }, {
        value: "grok-beta",
        title: "Quality Index - 70",
        label: "Grok-Beta"
      }]
    }, {
      label: "By ToolBaz",
      models: [{
        value: "toolbaz_v3.5_pro",
        title: "Quality Index - 61",
        label: "ToolBaz-v3.5-Pro"
      }, {
        value: "toolbaz_v3",
        title: "",
        label: "ToolBaz-v3"
      }]
    }, {
      label: "By Mixtral",
      models: [{
        value: "mixtral_8x22b",
        title: "Quality Index - 61",
        label: "Mixtral (8x22b)"
      }]
    }, {
      label: "Others (Unfiltered)",
      models: [{
        value: "L3-70B-Euryale-v2.1",
        title: "Quality Index - 70B",
        label: "L3-Euryale-v2.1 (70B)"
      }, {
        value: "midnight-rose",
        title: "",
        label: "Midnight-Rose 🆕"
      }, {
        value: "unity",
        title: "",
        label: "Unity 🆕"
      }, {
        value: "unfiltered_x",
        title: "",
        label: "Unfiltered_X (8x22b)"
      }]
    }];
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const toolbaz = new ToolbazAI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Missing required parameters: prompt"
          });
        }
        result = await toolbaz.chat(params);
        break;
      case "model":
        result = toolbaz.models();
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: `Request failed: ${error.message}`
    });
  }
}