import axios from "axios";
import crypto from "crypto";
class Olmo {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "https://olmo-api.allen.ai/v3",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://playground.allenai.org",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://playground.allenai.org/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
    this.options = {
      max_tokens: {
        default: 2048,
        min: 1,
        max: 2048,
        step: 1
      },
      temperature: {
        default: .7,
        min: 0,
        max: 1,
        step: .01
      },
      top_p: {
        default: 1,
        min: .01,
        max: 1,
        step: .01
      },
      n: {
        default: 1,
        min: 1,
        max: 1,
        step: 1
      },
      stop: {
        default: null
      },
      logprobs: {
        default: null,
        min: 0,
        max: 10,
        step: 1
      }
    };
    this.anonymousUserId = null;
  }
  async whoami() {
    const tempId = crypto.randomUUID();
    const {
      data
    } = await this.axiosInstance.get("/whoami", {
      headers: {
        "x-anonymous-user-id": tempId
      }
    });
    this.anonymousUserId = data.client || tempId;
    return data;
  }
  getModels() {
    return [{
      description: "AI2's 7B model trained on the Dolma dataset and fine-tuned for chat.",
      family_id: "olmo",
      family_name: "OLMo",
      host: "inferd",
      id: "olmo-7b-instruct",
      is_deprecated: true,
      model_type: "chat",
      name: "OLMo-1.7-7B-Instruct"
    }, {
      description: "A 70B parameter model that is a fine-tuned version of Llama 2.",
      family_id: "tulu",
      family_name: "Tülü",
      host: "inferd",
      id: "tulu2",
      is_deprecated: true,
      model_type: "chat",
      name: "Tulu2.5"
    }, {
      description: "Ai2's 13B model using the OLMo2 architecture.",
      family_id: "olmo",
      family_name: "OLMo",
      host: "modal",
      id: "OLMo-2-1124-13B-Instruct",
      is_deprecated: false,
      model_type: "chat",
      name: "OLMo 2 13B Instruct"
    }, {
      description: "AI2's 7B model trained on the Dolma dataset and fine-tuned for chat as of 07/25/2024.",
      family_id: "olmo",
      family_name: "OLMo",
      host: "modal",
      id: "OLMo-7B-0724-Instruct-hf",
      is_deprecated: true,
      model_type: "chat",
      name: "OLMo-7B-0724-Instruct-hf"
    }, {
      description: "AI2's Mixture-of-Experts LLM as of Sept. 2024",
      family_id: "olmo",
      family_name: "OLMo",
      host: "modal",
      id: "OLMoE-1B-7B-0924-Instruct",
      is_deprecated: true,
      model_type: "chat",
      name: "OLMoE-1B-7B-0924-Instruct"
    }, {
      description: "AI2's 7B model following the 'peteish' thread of improvements.",
      family_id: "olmo",
      family_name: "OLMo",
      host: "modal",
      id: "OLMo-peteish-dpo-preview",
      is_deprecated: true,
      model_type: "chat",
      name: "OLMo-peteish-dpo-preview"
    }, {
      description: "Ai2's 13B model using the OLMo2 architecture, base model not tuned for chat.",
      family_id: "olmo",
      family_name: "OLMo",
      host: "modal",
      id: "olmo1124-nowup-legal-whammy-2-soup-step11931",
      is_deprecated: true,
      model_type: "chat",
      name: "OLMo2 13B Base"
    }, {
      description: "A preview version of Ai2's latest Tulu model",
      family_id: "tulu",
      family_name: "Tülü",
      host: "modal",
      id: "Llama-3-1-Tulu-3-8B",
      is_deprecated: false,
      model_type: "chat",
      name: "Llama Tülü 3 8B"
    }, {
      description: "A 70B checkpoint of Ai2's latest Tulu model",
      family_id: "tulu",
      family_name: "Tülü",
      host: "modal",
      id: "Llama-3-1-Tulu-3-70B",
      is_deprecated: false,
      model_type: "chat",
      name: "Llama Tülü 3 70B"
    }];
  }
  parse(raw) {
    return raw.split("\n").reduce((acc, line) => {
      try {
        const parsed = JSON.parse(line);
        return parsed?.message?.startsWith("msg_") ? acc + (parsed.content || "") : acc;
      } catch {
        return acc;
      }
    }, "");
  }
  async chat(content, model = "OLMo-2-1124-13B-Instruct", host = "modal", userOpts = {}) {
    if (!content || content.trim() === "") {
      throw new Error("Content kosong.");
    }
    if (!this.anonymousUserId) {
      await this.whoami();
    }
    const models = this.getModels();
    const sm = models.find(m => m.id === model);
    if (!sm) {
      throw new Error(`Model tidak ditemukan. Pilih: ${models.map(m => m.id).join(", ")}`);
    }
    if (host !== sm.host) {
      throw new Error(`Host salah. Gunakan: ${sm.host}`);
    }
    const opts = {
      ...this.options,
      ...userOpts
    };
    for (const [key, value] of Object.entries(opts)) {
      if (typeof value === "object" && value !== null) {
        opts[key] = userOpts[key] || value.default;
      }
    }
    const {
      data
    } = await this.axiosInstance.post("/message/stream", {
      content: content,
      private: false,
      model: model,
      host: host,
      opts: opts
    }, {
      responseType: "stream",
      headers: {
        "x-anonymous-user-id": this.anonymousUserId
      }
    });
    return new Promise((resolve, reject) => {
      let raw = "";
      data.on("data", chunk => raw += chunk.toString());
      data.on("end", () => resolve(this.parse(raw)));
      data.on("error", reject);
    });
  }
  getOptions() {
    return this.options;
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    action,
    ...params
  } = method === "POST" ? req.body : req.query;
  const olmoInstance = new Olmo();
  if (!action) {
    return res.status(400).json({
      message: "Action tidak ditemukan."
    });
  }
  try {
    switch (action) {
      case "chat": {
        const {
          content,
          model,
          host,
          options
        } = params;
        if (!content) {
          return res.status(400).json({
            message: "Content tidak boleh kosong."
          });
        }
        const response = await olmoInstance.chat(content, model, host, options);
        return res.status(200).json({
          result: response
        });
      }
      case "whoami": {
        const userInfo = await olmoInstance.whoami();
        return res.status(200).json({
          result: userInfo
        });
      }
      case "models": {
        const models = olmoInstance.getModels();
        return res.status(200).json({
          result: models
        });
      }
      default:
        return res.status(400).json({
          message: `Action '${action}' tidak valid.`
        });
    }
  } catch (error) {
    console.error("API Error:", error.message);
    return res.status(500).json({
      message: "Terjadi kesalahan server."
    });
  }
}