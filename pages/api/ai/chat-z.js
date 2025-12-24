import axios from "axios";
import crypto from "crypto";
class ChatZAI {
  constructor() {
    this.config = {
      baseURL: "https://chat.z.ai",
      endpoint: {
        auth: "/api/v1/auths/",
        models: "/api/models",
        chat: "/api/v1/chats/new",
        completions: "/api/chat/completions"
      },
      secret: "junjie"
    };
    this.apiClient = axios.create({
      baseURL: this.config.baseURL,
      headers: {
        "user-agent": "Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0"
      }
    });
    this.title = "Wi5haSBDaGF0IC0gRnJlZSBBSSBwb3dlcmVkIGJ5IEdMTS00LjYgJiBHTE0tNC41";
    this.models = null;
    this.token = null;
    this.userId = null;
    this.chatId = null;
    this.cookies = {
      date: new Date().toISOString().slice(0, 10)
    };
    console.log("[PROSES]: Klien ChatZAI telah diinisialisasi.");
  }
  sign(prompt, chatId) {
    const [url, timestamp, requestId, timeFormat, currentDate] = [new URL(`/c/${chatId}`, this.config.baseURL), String(Date.now()), crypto.randomUUID(), Intl.DateTimeFormat(), new Date()];
    const params = {
      timestamp: timestamp,
      requestId: requestId,
      user_id: this.userId,
      version: "0.0.1",
      platform: "web",
      token: this.token,
      user_agent: this.apiClient.defaults.headers.common["user-agent"],
      language: "id-ID",
      languages: "id-ID,en-US,id,en",
      timezone: timeFormat.resolvedOptions().timeZone,
      cookie_enabled: "true",
      screen_width: "461",
      screen_height: "1024",
      screen_resolution: "461x1024",
      viewport_height: "1051",
      viewport_width: "543",
      viewport_size: "543x1051",
      color_depth: "24",
      pixel_ratio: "1.328460693359375",
      current_url: url.href,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      host: url.host,
      hostname: url.hostname,
      protocol: url.protocol,
      referrer: "",
      title: Buffer.from(this.title, "base64").toString(),
      timezone_offset: String(currentDate.getTimezoneOffset()),
      local_time: currentDate.toISOString(),
      utc_time: currentDate.toUTCString(),
      is_mobile: "true",
      is_touch: "true",
      max_touch_points: "5",
      browser_name: "Chrome",
      os_name: "Android"
    };
    const sortedParams = [...Object.entries({
      timestamp: timestamp,
      requestId: requestId,
      user_id: this.userId
    }).sort()].join(",");
    const encodedPrompt = Buffer.from(String.fromCharCode(...new Uint8Array(new TextEncoder().encode(prompt.trim()))), "binary").toString("base64");
    const timeBucket = Math.floor(Number(timestamp) / 3e5);
    const key = crypto.createHmac("sha256", this.config.secret).update(String(timeBucket)).digest("hex");
    const signature = crypto.createHmac("sha256", key).update([sortedParams, encodedPrompt, timestamp].join("|")).digest("hex");
    return {
      signature: signature,
      params: {
        ...params,
        signature_timestamp: timestamp
      }
    };
  }
  finalizeParsedData(parsedData) {
    const result = {
      thinking: "",
      answer: "",
      search: [],
      usage: parsedData.usage || null
    };
    if (parsedData.thinking && parsedData.thinking.content) {
      const thinkingMatch = parsedData.thinking.content.match(/<details[^>]*>([\s\S]*)$/s);
      result.thinking = thinkingMatch ? thinkingMatch[1].trim() : parsedData.thinking.content.trim();
    }
    if (parsedData.answer && parsedData.answer.content) {
      const finishContent = parsedData.answer.content;
      const toolCallMatch = finishContent.match(/<glm_block[\s\S]*?><\/glm_block>/);
      if (toolCallMatch) {
        const toolCallString = toolCallMatch[0];
        const toolCallEndIndex = toolCallMatch.index + toolCallString.length;
        result.answer = finishContent.substring(toolCallEndIndex).trim();
        try {
          const jsonContentMatch = toolCallString.match(/<glm_block[^>]*>([\s\S]*?)<\/glm_block>/);
          if (jsonContentMatch && jsonContentMatch[1]) {
            const toolData = JSON.parse(jsonContentMatch[1]);
            result.search = toolData?.data?.browser?.search_result || [];
          }
        } catch (error) {
          console.error("[ERROR]: Gagal mem-parsing JSON dari tool call:", error.message);
        }
      } else {
        result.answer = finishContent.trim();
      }
    }
    result.thinking = result.thinking.replace(/【turn0search(\d+)】/g, "[$1]");
    result.answer = result.answer.replace(/【turn0search(\d+)】/g, "[$1]");
    return result;
  }
  getModel() {
    if (!this.models) throw new Error("Model belum diambil. Panggil fetchModels() terlebih dahulu.");
    return this.models.map(m => m.id);
  }
  async authenticate() {
    console.log("[PROSES]: Melakukan autentikasi...");
    try {
      const response = await this.apiClient.get(this.config.endpoint.auth, {
        headers: {
          Cookie: this.getCookieString()
        }
      });
      const authData = response.data;
      this.token = authData.token;
      this.userId = authData.id;
      this.cookies.token = authData.token;
      this.cookies["set-cookie"] = response.headers["set-cookie"]?.join("; ") || "";
      console.log("[SUKSES]: Autentikasi berhasil. User ID:", this.userId);
      return authData;
    } catch (error) {
      console.error("[ERROR]: Autentikasi gagal:", error.response?.data || error.message);
      throw error;
    }
  }
  getCookieString() {
    return Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
  }
  async fetchModels() {
    console.log("[PROSES]: Mengambil daftar model yang tersedia...");
    await this.authenticate();
    try {
      const response = await this.apiClient.get(this.config.endpoint.models, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Cookie: this.getCookieString()
        }
      });
      this.models = response.data.data;
      console.log("[SUKSES]: Model berhasil diambil.");
      return this.models;
    } catch (error) {
      console.error("[ERROR]: Gagal mengambil model:", error.response?.data || error.message);
      throw error;
    }
  }
  getModelItem(modelId) {
    if (!this.models) throw new Error("Model belum diambil. Panggil fetchModels() terlebih dahulu.");
    const model = this.models.find(m => m.id === modelId);
    if (!model) throw new Error(`Model ${modelId} tidak ditemukan. Model yang tersedia: ${this.getModel().join(", ")}`);
    const modelCopy = JSON.parse(JSON.stringify(model));
    modelCopy.info.user_id = this.userId;
    return modelCopy;
  }
  async createNewChat(prompt, modelId = "GLM-4-6-API-V1") {
    console.log("[PROSES]: Tidak ada ID chat aktif. Membuat chat baru...");
    await this.authenticate();
    if (!this.models) await this.fetchModels();
    if (!modelId || this.getModel().indexOf(modelId) === -1) {
      throw new Error(`ID Model tidak valid atau hilang: ${modelId || "tidak ada"}. Model yang tersedia: ${this.getModel().join(", ")}`);
    }
    const timestamp = Math.floor(Date.now() / 1e3);
    const messageId = crypto.randomUUID();
    const payload = {
      chat: {
        id: "",
        title: "New Chat",
        models: [modelId],
        params: {},
        history: {
          messages: {
            [messageId]: {
              id: messageId,
              parentId: null,
              childrenIds: [],
              role: "user",
              content: prompt,
              timestamp: timestamp,
              models: [modelId]
            }
          },
          currentId: messageId
        },
        messages: [{
          id: messageId,
          parentId: null,
          childrenIds: [],
          role: "user",
          content: prompt,
          timestamp: timestamp,
          models: [modelId]
        }],
        tags: [],
        flags: [],
        features: [{
          type: "mcp",
          server: "vibe-coding",
          status: "hidden"
        }, {
          type: "mcp",
          server: "ppt-maker",
          status: "hidden"
        }, {
          type: "mcp",
          server: "image-search",
          status: "hidden"
        }, {
          type: "mcp",
          server: "deep-research",
          status: "hidden"
        }, {
          type: "tool_selector",
          server: "tool_selector",
          status: "hidden"
        }, {
          type: "mcp",
          server: "advanced-search",
          status: "hidden"
        }],
        mcp_servers: [],
        enable_thinking: true,
        auto_web_search: false,
        timestamp: timestamp * 1e3 - 253
      }
    };
    try {
      const response = await this.apiClient.post(this.config.endpoint.chat, payload, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Cookie: this.getCookieString()
        }
      });
      this.chatId = response.data.id;
      console.log("[SUKSES]: Chat baru berhasil dibuat dengan ID:", this.chatId);
      return response.data;
    } catch (error) {
      console.error("[ERROR]: Gagal membuat chat baru:", error.response?.data || error.message);
      throw error;
    }
  }
  async chat({
    prompt,
    messages,
    model = "GLM-4-6-API-V1",
    system_prompt = null,
    search = false,
    deepthink = false,
    ...options
  }) {
    if (!prompt) throw new Error("Pertanyaan diperlukan.");
    if (!this.models) await this.fetchModels();
    if (!model || this.getModel().indexOf(model) === -1) {
      throw new Error(`ID Model tidak valid atau hilang: ${model || "tidak ada"}. Model yang tersedia: ${this.getModel().join(", ")}`);
    }
    if (!this.token || !this.userId) await this.authenticate();
    if (!this.chatId) await this.createNewChat(prompt, model);
    const chatId = crypto.randomUUID();
    const {
      signature,
      params
    } = this.sign(prompt, chatId);
    const modelItem = this.getModelItem(model);
    const payloadMessages = [...system_prompt ? [{
      role: "system",
      content: system_prompt
    }] : [], ...messages && messages.length > 0 ? messages : [{
      role: "user",
      content: prompt
    }]];
    const chatData = {
      stream: true,
      model: model,
      messages: payloadMessages,
      signature_prompt: prompt,
      params: {},
      tool_servers: [],
      features: {
        image_generation: false,
        code_interpreter: false,
        web_search: search,
        auto_web_search: search,
        preview_mode: true,
        flags: [],
        features: [{
          type: "mcp",
          server: "vibe-coding",
          status: "hidden"
        }, {
          type: "mcp",
          server: "ppt-maker",
          status: "hidden"
        }, {
          type: "mcp",
          server: "image-search",
          status: "hidden"
        }, {
          type: "mcp",
          server: "deep-research",
          status: "hidden"
        }, {
          type: "tool_selector",
          server: "tool_selector",
          status: "hidden"
        }, {
          type: "mcp",
          server: "advanced-search",
          status: "hidden"
        }],
        enable_thinking: deepthink
      },
      variables: {
        "{{USER_NAME}}": `Guest-${Date.now()}`,
        "{{USER_LOCATION}}": "Unknown",
        "{{CURRENT_DATETIME}}": new Date().toISOString().slice(0, 19).replace("T", " "),
        "{{CURRENT_DATE}}": new Date().toISOString().slice(0, 10),
        "{{CURRENT_TIME}}": new Date().toTimeString().slice(0, 8),
        "{{CURRENT_WEEKDAY}}": new Date().toLocaleDateString("en-US", {
          weekday: "long"
        }),
        "{{CURRENT_TIMEZONE}}": params.timezone,
        "{{USER_LANGUAGE}}": params.language
      },
      model_item: modelItem,
      chat_id: chatId,
      id: crypto.randomUUID(),
      ...options
    };
    try {
      console.log("[PROSES]: Mengirim permintaan ke endpoint completions...");
      const response = await this.apiClient.post(this.config.endpoint.completions, chatData, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Cookie: this.getCookieString(),
          "X-Signature": signature,
          "X-FE-Version": "prod-fe-1.0.52"
        },
        params: params,
        responseType: "stream"
      });
      const stream = response.data;
      const accumulatedData = {
        thinking: {
          content: ""
        },
        answer: {
          content: ""
        },
        usage: null
      };
      return new Promise((resolve, reject) => {
        let buffer = "";
        stream.on("data", chunk => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            if (trimmedLine.startsWith("data:")) {
              const jsonString = trimmedLine.slice(5).trim();
              if (jsonString === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonString);
                const data = parsed.data;
                if (!data || !data.phase) continue;
                const phase = data.phase;
                if (data.delta_content !== undefined && data.delta_content !== null) {
                  if (!accumulatedData[phase]) {
                    accumulatedData[phase] = {
                      content: ""
                    };
                  }
                  accumulatedData[phase].content += data.delta_content;
                }
                if (data.usage) {
                  accumulatedData.usage = data.usage;
                }
                if (phase === "done" && data.done) {
                  console.log("[LOG STREAM]: Stream marked as done");
                }
              } catch (error) {
                if (jsonString.length > 10) {
                  console.warn(`[PERINGATAN]: Mengabaikan baris JSON yang tidak valid: ${jsonString.substring(0, 100)}...`);
                }
              }
            }
          }
        });
        stream.on("end", () => {
          console.log("[PROSES]: Stream selesai. Memfinalisasi hasil...");
          try {
            const finalResult = this.finalizeParsedData(accumulatedData);
            console.log("[SUKSES]: Penyelesaian chat berhasil.");
            resolve({
              status: true,
              data: finalResult
            });
          } catch (error) {
            console.error("[ERROR]: Gagal memfinalisasi hasil:", error.message);
            reject({
              status: false,
              msg: `Gagal memfinalisasi hasil: ${error.message}`
            });
          }
        });
        stream.on("error", err => {
          console.error("[ERROR]: Terjadi kesalahan pada stream:", err.message);
          reject({
            status: false,
            msg: `Kesalahan stream: ${err.message}`
          });
        });
      });
    } catch (error) {
      console.error("[ERROR]: Gagal menyelesaikan chat:", error.response?.data || error.message);
      if (error.response?.status === 401 && this.token) {
        console.log("[PROSES]: Token kedaluwarsa, membersihkan dan mencoba lagi...");
        this.token = null;
        this.userId = null;
        this.chatId = null;
        return await this.chat({
          prompt: prompt,
          messages: messages,
          model: model,
          system_prompt: system_prompt,
          search: search,
          deepthink: deepthink,
          ...options
        });
      }
      return {
        status: false,
        msg: error.message,
        ...error?.response?.data || error?.response || {}
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const client = new ChatZAI();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}