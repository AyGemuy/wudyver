import fetch from "node-fetch";
import FormData from "form-data";
import {
  randomUUID
} from "crypto";
const REMOTE_CONFIG = {
  provider_metadatas: [{
    name: "gpt5",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "gpt_5",
      max_token: 1024,
      temperature: 1,
      memory: 50
    }, {
      platform_type: "openAI",
      platform_model: "gpt_5",
      max_token: 1024,
      temperature: 1,
      memory: 50
    }]
  }, {
    name: "gpt5_nano",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "gpt_5_nano",
      max_token: 4096,
      temperature: 1,
      memory: 50
    }, {
      platform_type: "openAI",
      platform_model: "gpt_5_nano",
      max_token: 4096,
      temperature: 1,
      memory: 50
    }]
  }, {
    name: "gpt5_mini",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "gpt_5_mini",
      max_token: 1024,
      temperature: 1,
      memory: 50
    }, {
      platform_type: "openAI",
      platform_model: "gpt_5_mini",
      max_token: 1024,
      temperature: 1,
      memory: 50
    }]
  }, {
    name: "gpt41",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "gpt_4_1",
      max_token: 1024,
      temperature: .8,
      memory: 50
    }, {
      platform_type: "openAI",
      platform_model: "gpt_4_1",
      max_token: 1024,
      temperature: 1,
      memory: 50
    }]
  }, {
    name: "gpt41_mini",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "gpt_4_1_mini",
      max_token: 1024,
      temperature: .8,
      memory: 50
    }, {
      platform_type: "openAI",
      platform_model: "gpt_4_1_mini",
      max_token: 1024,
      temperature: 1,
      memory: 50
    }]
  }, {
    name: "gpt4o_mini",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "gpt_4o_mini",
      max_token: 1024,
      temperature: .8,
      memory: 50
    }, {
      platform_type: "openAI",
      platform_model: "gpt_4o_mini",
      max_token: 1024,
      temperature: 1,
      memory: 50
    }]
  }, {
    name: "gemini25_pro",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "gemini_2_5_pro",
      max_token: 4096,
      temperature: .8,
      memory: 50
    }]
  }, {
    name: "gemini25_flash",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "gemini_2_5_flash",
      max_token: 1024,
      temperature: .8,
      memory: 50
    }]
  }, {
    name: "gemini25_flash_lite",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "gemini_2_5_flash_lite",
      max_token: 1024,
      temperature: .8,
      memory: 50
    }]
  }, {
    name: "claude_sonnet45",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "anthropic_claude_sonnet_4_5",
      max_token: 1024,
      temperature: .8,
      memory: 50
    }]
  }, {
    name: "claude_opus45",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "anthropic_claude_opus_4_5",
      max_token: 1024,
      temperature: .8,
      memory: 50
    }]
  }, {
    name: "llama4",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "llama_4",
      max_token: 1024,
      temperature: .8,
      memory: 50
    }]
  }, {
    name: "llama33",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "llama_3_3",
      max_token: 1024,
      temperature: .8,
      memory: 50
    }]
  }, {
    name: "grok4",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "grok_4_fast",
      max_token: 1024,
      temperature: .8,
      memory: 50
    }]
  }, {
    name: "deep_seek_v32",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "deepseek_v3_2",
      max_token: 1024,
      temperature: .8,
      memory: 50
    }]
  }, {
    name: "mistral_ai",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "mistral_nemo",
      max_token: 1024,
      temperature: .8,
      memory: 50
    }]
  }, {
    name: "qwen",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "qwen_3",
      max_token: 1024,
      temperature: .8,
      memory: 50
    }]
  }, {
    name: "palm2",
    metadatas: [{
      platform_type: "openRouterAI",
      platform_model: "palm2_chat",
      max_token: 1024,
      temperature: .8,
      memory: 50
    }]
  }],
  rate_sweet_moments: {
    onboarding_enabled: false
  }
};
const CONFIG = {
  apiKey: "AIzaSyDRE523jd1mnPSFoQHD0sxD1ARY-KkOpV0",
  authBase: "https://identitytoolkit.googleapis.com/v1/accounts",
  urls: {
    main_api: "https://chatai2-32311.ew.r.appspot.com",
    chat_service: "https://chat-service-app-staging-vfgwibygxa-ew.a.run.app/v1/chat",
    image_service: "https://chatai-image-staging-vfgwibygxa-ew.a.run.app"
  },
  appVersion: "1.1.7",
  sysPrompt: "You're an AI chat assistant developed by Connectinno."
};
class UniversalAI {
  constructor() {
    this.devID = randomUUID();
    this.token = null;
    this.uid = null;
    this.chatId = randomUUID();
    this.models = REMOTE_CONFIG.provider_metadatas;
    this.modes = ["chat", "image", "style"];
    console.log(`[INIT] AI Instance Created. ID: ${this.devID}`);
  }
  list() {
    return this.models.map(m => m.name);
  }
  _conf(name) {
    const grp = this.models.find(m => m.name === name);
    return grp ? grp.metadatas.find(m => m.platform_type === "openRouterAI") || grp.metadatas[0] : null;
  }
  async _procImg(inp) {
    try {
      console.log("   🖼️ [PROC] Processing Image...");
      if (!inp) return null;
      if (Buffer.isBuffer(inp)) return inp;
      if (typeof inp === "string") {
        if (inp.startsWith("http")) {
          const r = await fetch(inp);
          return Buffer.from(await r.arrayBuffer());
        }
        return Buffer.from(inp.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      throw new Error("Unknown format");
    } catch (e) {
      console.error("   ❌ [PROC] Image Error:", e.message);
      throw e;
    }
  }
  _parse(raw) {
    try {
      let res = "",
        inf = {};
      for (let i = 0, d = 0, q = 0, s = 0; i < raw.length; i++) {
        if (raw[i] === '"' && raw[i - 1] !== "\\") q = !q;
        if (!q && raw[i] === "{" && d++ === 0) s = i;
        if (!q && raw[i] === "}" && --d === 0) {
          try {
            const {
              text,
              ...r
            } = JSON.parse(raw.slice(s, i + 1));
            res += text || "";
            Object.assign(inf, r);
          } catch (e) {}
        }
      }
      return {
        content: res,
        ...inf
      };
    } catch (e) {
      console.error("   ❌ [PARSE] Error:", e.message);
      return {
        content: raw,
        error: "ParseErr"
      };
    }
  }
  async auth() {
    if (this.token) {
      console.log("ℹ️ [AUTH] Session Active.");
      return;
    }
    console.log("🔐 [AUTH] Authenticating...");
    try {
      const sRes = await fetch(`${CONFIG.authBase}:signUp?key=${CONFIG.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          returnSecureToken: true
        })
      });
      const sData = await sRes.json();
      if (!sData.idToken) throw new Error(sData.error?.message || "No Token");
      this.token = sData.idToken;
      this.uid = sData.localId;
      await fetch(`${CONFIG.urls.main_api}/get_token`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      console.log(`   ✅ [AUTH] Success. UID: ${this.uid.substring(0, 6)}...`);
    } catch (e) {
      console.error("   ❌ [AUTH] Fatal Error:", e.message);
      throw e;
    }
  }
  async generate(params) {
    console.log("\n🚀 [GEN] New Request Started");
    try {
      const {
        mode,
        prompt,
        model = "gpt4o_mini",
        style = "ghibli",
        img,
        ...rest
      } = params;
      console.log(`   🔍 [VALIDATE] Checking Mode: '${mode}'...`);
      if (!mode || !this.modes.includes(mode)) {
        const err = {
          status: "error",
          message: "Invalid/Missing Mode",
          input: mode,
          available_modes: this.modes
        };
        console.warn("   ⚠️ [VALIDATE] Invalid Mode.");
        return err;
      }
      if (!prompt) {
        console.warn("   ⚠️ [VALIDATE] Missing Prompt.");
        return {
          status: "error",
          message: "Parameter 'prompt' is required."
        };
      }
      if (mode === "style" && !img) {
        console.warn("   ⚠️ [VALIDATE] Missing Image for Style.");
        return {
          status: "error",
          message: "Parameter 'img' is required for style mode."
        };
      }
      if (mode === "chat") {
        const validModels = this.list();
        if (!validModels.includes(model)) {
          console.warn(`   ⚠️ [VALIDATE] Invalid Model: '${model}'`);
          return {
            status: "error",
            message: "Invalid Model Name",
            input: model,
            available_models: validModels
          };
        }
      }
      await this.auth();
      console.log(`   👉 [ROUTE] Routing to ${mode.toUpperCase()}...`);
      if (mode === "chat") return await this._chat(prompt, this._conf(model), rest);
      if (mode === "image") return await this._genImg(prompt, rest);
      if (mode === "style") return await this._genStyle(prompt, style, img, rest);
    } catch (e) {
      console.error("❌ [GEN] Process Failed:", e.message);
      return {
        status: "error",
        message: e.message
      };
    }
  }
  async _chat(msg, meta, opts = {}) {
    try {
      console.log("   📡 [API] Preparing Chat Payload...");
      const payload = {
        app_name: "CA",
        display_user_id: String(this.uid),
        device_id: String(this.devID),
        user_message: msg,
        model_name: meta.platform_model,
        platform: meta.platform_type,
        chat_type: "chat",
        max_token: parseInt(meta.max_token),
        temperature: parseFloat(meta.temperature),
        timeout_duration: 3e4,
        history: {
          id: this.chatId,
          title: "Chat",
          userInputs: {
            inputMap: {
              init: "true"
            },
            additionalParameters: {
              init: "true"
            }
          },
          messages: [{
            id: randomUUID(),
            message: CONFIG.sysPrompt,
            createdAt: new Date().toISOString(),
            prefix: "model",
            canRegenerate: false
          }, {
            id: randomUUID(),
            message: msg,
            createdAt: new Date().toISOString(),
            prefix: "user",
            canRegenerate: true
          }],
          isStarred: false,
          promptTemplate: "chat",
          webSearchEnabled: false,
          metadata: {
            platform_type: meta.platform_type,
            platform_model: meta.platform_model,
            max_token: parseInt(meta.max_token),
            temperature: parseFloat(meta.temperature),
            memory: parseInt(meta.memory)
          }
        },
        additional_parameter_map: {},
        ...opts
      };
      console.log("   📡 [API] Sending to Chat Service...");
      const res = await fetch(CONFIG.urls.chat_service, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
          "User-Agent": `ChatAIUltra/${CONFIG.appVersion}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`API Error ${res.status}: ${await res.text()}`);
      console.log("   ✅ [API] Response Received.");
      return this._parse(await res.text());
    } catch (e) {
      throw e;
    }
  }
  async _genImg(prompt, opts = {}) {
    try {
      console.log("   🎨 [API] Preparing Image Data...");
      const form = new FormData();
      form.append("user_prompt", String(prompt));
      for (const k in opts) {
        console.log(`      + Param: ${k}=${opts[k]}`);
        form.append(k, String(opts[k]));
      }
      console.log("   📡 [API] Sending to Image Service...");
      const res = await fetch(`${CONFIG.urls.image_service}/api/v1/generate_image`, {
        method: "POST",
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.token}`,
          device_id: String(this.devID),
          latest_app_version: CONFIG.appVersion,
          display_user_id: String(this.uid)
        },
        body: form
      });
      if (!res.ok) throw new Error(`API Error ${res.status}: ${await res.text()}`);
      console.log("   ✅ [API] Image Generated.");
      return await res.json();
    } catch (e) {
      throw e;
    }
  }
  async _genStyle(prompt, style, img, opts = {}) {
    try {
      const buf = await this._procImg(img);
      console.log("   🎨 [API] Preparing Style Data...");
      const form = new FormData();
      form.append("style", style);
      form.append("image", buf, {
        filename: "i.jpg",
        contentType: "image/jpeg"
      });
      form.append("user_prompt", String(prompt));
      for (const k in opts) form.append(k, String(opts[k]));
      console.log("   📡 [API] Sending to Style Service...");
      const res = await fetch(`${CONFIG.urls.image_service}/api/v1/generate_image_with_style`, {
        method: "POST",
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.token}`,
          device_id: String(this.devID),
          latest_app_version: CONFIG.appVersion,
          display_user_id: String(this.uid)
        },
        body: form
      });
      if (!res.ok) throw new Error(`API Error ${res.status}: ${await res.text()}`);
      console.log("   ✅ [API] Styled Image Generated.");
      return await res.json();
    } catch (e) {
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new UniversalAI();
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