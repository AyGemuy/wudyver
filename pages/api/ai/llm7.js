import axios from "axios";
class LLM7 {
  constructor() {
    this.base = "https://api.llm7.io";
    this.head = {
      accept: "*/*",
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      origin: "https://llm7.chat",
      referer: "https://llm7.chat/"
    };
  }
  async det(input) {
    try {
      console.log(`[LOG] Checking type for: "${input.slice(0, 15)}..."`);
      const res = await axios.get(`${this.base}/is-image-gen-request`, {
        headers: this.head,
        params: {
          user_input: input
        }
      });
      return res?.data?.is_image_gen_request || false;
    } catch (e) {
      console.error("[LOG] Detect fail, default to text");
      return false;
    }
  }
  async models({
    ...rest
  }) {
    try {
      console.log("[LOG] Fetching models...");
      const res = await axios.get(`${this.base}/v1/models`, {
        headers: this.head,
        ...rest
      });
      return res?.data || [];
    } catch (e) {
      console.error("[LOG] Models error");
      return [];
    }
  }
  async chat({
    prompt,
    messages = [],
    auto = true,
    ...rest
  }) {
    try {
      const isImg = auto ? await this.det(prompt) : false;
      const history = messages.length ? [...messages, {
        role: "user",
        content: prompt
      }] : [{
        role: "user",
        content: prompt
      }];
      const endpoint = isImg ? "/v1/images/generations" : "/v1/chat/completions";
      const payload = isImg ? {
        model: rest?.model || "flux",
        prompt: prompt,
        nologo: rest?.nologo ?? false,
        seed: rest?.seed || Math.floor(Math.random() * 1e9),
        ...rest
      } : {
        model: rest?.model || "gpt-5-mini",
        messages: history,
        stream: rest?.stream ?? false,
        reasoning_effort: rest?.effort || "low",
        ...rest
      };
      console.log(`[LOG] Routing to ${endpoint} (Auto: ${auto})`);
      const res = await axios.post(`${this.base}${endpoint}`, payload, {
        headers: this.head
      });
      return res?.data;
    } catch (err) {
      const errorMsg = err?.response?.data || err.message;
      console.error("[LOG] Chat Process Error:", errorMsg);
      return {
        error: true,
        msg: errorMsg
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
      actions: ["models", "chat"]
    });
  }
  const api = new LLM7();
  try {
    let result;
    switch (action) {
      case "models":
        result = await api.models(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'"
          });
        }
        result = await api.chat(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["models", "chat"]
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