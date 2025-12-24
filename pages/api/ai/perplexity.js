import axios from "axios";
class Perplexity {
  constructor() {
    this.api = {
      base: "https://api.perplexity.ai/chat/completions",
      models: {
        "sonar-medium-online": {
          description: "Model medium dengan akses online",
          context: 12e3
        },
        "sonar-small-online": {
          description: "Model kecil dengan akses online",
          context: 12e3
        },
        "sonar-medium-chat": {
          description: "Model medium khusus chat",
          context: 12e3
        },
        "sonar-small-chat": {
          description: "Model kecil khusus chat",
          context: 12e3
        },
        "sonar-reasoning-pro": {
          description: "Model reasoning tingkat lanjut",
          context: 16384
        },
        "sonar-reasoning": {
          description: "Model reasoning seimbang",
          context: 8192
        },
        "sonar-pro": {
          description: "Model general-purpose yang lebih baik",
          context: 8192
        },
        sonar: {
          description: "Model cepat dan efisien",
          context: 4096
        },
        "mixtral-8x7b-instruct": {
          description: "Model instruksi Mixtral",
          context: 8192
        },
        "codellama-70b-instruct": {
          description: "Model khusus kode",
          context: 8192
        },
        "llama-2-70b-chat": {
          description: "Model LLaMA 2 untuk chat",
          context: 4096
        }
      },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Postify/1.0.0"
      },
      keys: ["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", "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", "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", "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", "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", "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", "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", "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"],
      retry: {
        maxAttempts: 3,
        delayMs: 2e3,
        timeoutMs: 6e4
      }
    };
  }
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  getKey() {
    return this.api.keys[Math.floor(Math.random() * this.api.keys.length)];
  }
  async retry(operation, attempt = 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.api.retry.maxAttempts) {
        throw error;
      }
      console.log(`🔄 Coba lagi attempt ke-${attempt}, tunggu ${this.api.retry.delayMs}ms...`);
      console.error(error.message);
      await this.delay(this.api.retry.delayMs * attempt);
      return await this.retry(operation, attempt + 1);
    }
  }
  createAxiosInstance() {
    return axios.create({
      baseURL: this.api.base,
      timeout: this.api.retry.timeoutMs,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
  }
  getHeaders(apiKey) {
    return {
      Authorization: `Bearer ${apiKey}`,
      ...this.api.headers
    };
  }
  validateParams(messages, model, temperature) {
    const errors = [];
    if (!Array.isArray(messages) || messages.length === 0) {
      errors.push({
        param: "messages",
        error: "Minimal ada satu pesan dalam input."
      });
    }
    messages.forEach((msg, i) => {
      if (!msg.role || !msg.content) {
        errors.push({
          param: `messages[${i}]`,
          error: "Format pesan salah."
        });
      }
    });
    if (!model || !this.api.models[model]) {
      errors.push({
        param: "model",
        error: "Model tidak valid.",
        available: Object.keys(this.api.models)
      });
    }
    if (typeof temperature !== "number" || temperature < 0 || temperature > 1) {
      errors.push({
        param: "temperature",
        error: "Temperature harus antara 0.0 - 1.0",
        recommended: .7
      });
    }
    return errors;
  }
  getAvailableModels() {
    return Object.entries(this.api.models).map(([key, value]) => ({
      name: key,
      description: value.description,
      context: value.context
    }));
  }
  async chat(messages, model = "sonar", temperature = .7) {
    const errors = this.validateParams(messages, model, temperature);
    if (errors.length) {
      return {
        status: false,
        code: 400,
        result: {
          error: "Paramenter salah.",
          details: errors
        }
      };
    }
    return await this.retry(async () => {
      const axiosInstance = this.createAxiosInstance();
      const apiKey = this.getKey();
      try {
        const response = await axiosInstance.post("", {
          model: model,
          messages: messages,
          temperature: temperature,
          max_tokens: 4096,
          stream: false
        }, {
          headers: this.getHeaders(apiKey)
        });
        return {
          status: true,
          code: 200,
          result: {
            response: response.data.choices[0].message.content,
            model: {
              name: model,
              ...this.api.models[model]
            }
          }
        };
      } catch (error) {
        throw {
          status: false,
          code: error.response?.status || 500,
          result: {
            error: "Terjadi kesalahan.",
            details: error.message
          }
        };
      }
    });
  }
  async stream(messages, model = "sonar", temperature = .7, onChunk) {
    const errors = this.validateParams(messages, model, temperature);
    if (errors.length) {
      return {
        status: false,
        code: 400,
        result: {
          error: "Paramenter salah.",
          details: errors
        }
      };
    }
    if (typeof onChunk !== "function") {
      return {
        status: false,
        code: 400,
        result: {
          error: "Callback function untuk stream tidak ditemukan.",
          example: "(chunk) => console.log(chunk)"
        }
      };
    }
    return await this.retry(async () => {
      const axiosInstance = this.createAxiosInstance();
      const apiKey = this.getKey();
      try {
        const response = await axiosInstance.post("", {
          model: model,
          messages: messages,
          temperature: temperature,
          max_tokens: 4096,
          stream: true
        }, {
          headers: this.getHeaders(apiKey),
          responseType: "stream"
        });
        let fullResponse = "";
        for await (const chunk of response.data) {
          const lines = chunk.toString().split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const result = JSON.parse(line.slice(5));
                if (result.choices?.[0]?.delta?.content) {
                  const content = result.choices[0].delta.content;
                  fullResponse += content;
                  onChunk(content);
                }
              } catch (e) {
                if (!line.includes("[DONE]")) console.warn("❌ Parsing chunk gagal:", e);
              }
            }
          }
        }
        return {
          status: true,
          code: 200,
          result: {
            response: fullResponse,
            model: {
              name: model,
              ...this.api.models[model]
            }
          }
        };
      } catch (error) {
        throw {
          status: false,
          code: error.response?.status || 500,
          result: {
            error: "Streaming error.",
            details: error.message
          }
        };
      }
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    prompt,
    messages,
    model = "sonar",
    temperature = .7,
    stream = false
  } = req.method === "GET" ? req.query : req.body;
  try {
    const perplexity = new Perplexity();
    switch (action) {
      case "chat": {
        const chatMessages = messages ?? [{
          role: "user",
          content: prompt
        }];
        if (!chatMessages || !Array.isArray(chatMessages) || chatMessages.length === 0) {
          return res.status(400).json({
            status: false,
            message: "Messages atau prompt diperlukan"
          });
        }
        if (stream) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          await perplexity.stream(chatMessages, model, temperature, chunk => {
            res.write(`data: ${JSON.stringify({
chunk: chunk
})}\n\n`);
          });
          res.end();
        } else {
          const response = await perplexity.chat(chatMessages, model, temperature);
          return res.status(200).json(response);
        }
        break;
      }
      case "models": {
        const models = perplexity.getAvailableModels();
        return res.status(200).json({
          status: true,
          models: models
        });
      }
      default:
        return res.status(400).json({
          status: false,
          message: "Action tidak valid"
        });
    }
  } catch (error) {
    return res.status(error.code || 500).json({
      status: false,
      message: error.message || "Internal Server Error"
    });
  }
}