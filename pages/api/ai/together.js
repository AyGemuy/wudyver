import axios from "axios";
class TogetherAPI {
  constructor() {
    this.baseUrl = "https://api.together.xyz/v1";
    this.api = null;
    this.apiKey = null;
    this.config = {
      models: {
        endpoint: "/models",
        method: "GET"
      },
      chat: {
        endpoint: "/chat/completions",
        method: "POST",
        requestType: "json",
        dataBuilder: p => ({
          model: p.model || "meta-llama/Meta-Llama-3-8B-Instruct-Reference",
          messages: p.messages || [{
            role: "user",
            content: "What are some fun things to do in New York?"
          }],
          max_tokens: p.max_tokens ?? 1024,
          temperature: p.temperature ?? .7,
          top_p: p.top_p ?? .7,
          top_k: p.top_k ?? 50,
          repetition_penalty: p.repetition_penalty ?? 1,
          stream: p.stream ?? false
        })
      },
      generateImage: {
        endpoint: "/images/generations",
        method: "POST",
        requestType: "json",
        dataBuilder: p => ({
          prompt: p.prompt,
          model: p.model || "stabilityai/stable-diffusion-xl-base-1.0",
          negative_prompt: p.negative_prompt,
          width: p.width ?? 1024,
          height: p.height ?? 1024,
          n: p.n ?? 1
        })
      },
      embeddings: {
        endpoint: "/embeddings",
        method: "POST",
        requestType: "json",
        dataBuilder: p => ({
          input: p.input,
          model: p.model || "togethercomputer/m2-bert-80M-8k-retrieval"
        })
      }
    };
  }
  async init() {
    if (this.api) return this;
    console.log("[Log] Memulai inisialisasi TogetherAI dan mengambil API key...");
    const apiKeyUrl = "https://apikey-api.vercel.app/apiKey";
    try {
      const response = await axios.get(apiKeyUrl);
      const keysData = response?.data?.data;
      if (!keysData || keysData.length === 0) throw new Error("Tidak ada API key yang diterima.");
      const apiKey = keysData[18]?.apiKey;
      if (!apiKey) throw new Error("Gagal mengekstrak API key pada urutan ke-12.");
      this.apiKey = apiKey;
      this.api = axios.create({
        baseURL: this.baseUrl,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        }
      });
      console.log("[Log] Inisialisasi TogetherAI berhasil. Klien siap digunakan.");
      return this;
    } catch (error) {
      console.error("[Log] Gagal melakukan inisialisasi TogetherAI:", error.message);
      throw error;
    }
  }
  async request(actionConfig, payload) {
    if (!this.api) {
      return {
        status: "error",
        message: "Klien belum diinisialisasi. Panggil `await together.init()` dulu.",
        data: null,
        details: null
      };
    }
    const {
      endpoint,
      method
    } = actionConfig;
    console.log(`[Log] Proses dimulai: ${method} ${this.baseUrl}${endpoint}`);
    try {
      let response;
      if (method === "GET") {
        response = await this.api.get(endpoint);
      } else {
        response = await this.api.post(endpoint, payload);
      }
      console.log(`[Log] Proses berhasil: ${endpoint}`);
      return {
        status: "success",
        message: "Permintaan berhasil diproses.",
        data: response.data,
        details: null
      };
    } catch (error) {
      const errorDetails = error?.response?.data || {
        code: "NETWORK_ERROR",
        message: error.message
      };
      console.error(`[Log] Error pada ${endpoint}:`, JSON.stringify(errorDetails, null, 2));
      return {
        status: "error",
        message: "Terjadi kesalahan saat berkomunikasi dengan API Together.",
        data: null,
        details: errorDetails
      };
    }
  }
  async run({
    action,
    ...rest
  }) {
    console.log(`[Log] Aksi diminta: ${action || "Tidak ada"}`);
    try {
      await this.init();
    } catch (initError) {
      return {
        status: "error",
        message: initError.message,
        data: null,
        details: null
      };
    }
    const actionConfig = this.config[action];
    if (!actionConfig) {
      const availableActions = Object.keys(this.config);
      const errorMessage = `Aksi '${action || ""}' tidak valid atau kosong.`;
      console.error(`[Error] ${errorMessage}`);
      return {
        status: "error",
        message: errorMessage,
        data: null,
        details: {
          available_actions: availableActions
        }
      };
    }
    const payload = actionConfig.dataBuilder ? actionConfig.dataBuilder(rest) : {};
    if (action === "generateImage" && !payload.prompt) {
      return {
        status: "error",
        message: "Paramenter 'prompt' wajib diisi untuk aksi 'generateImage'.",
        data: null
      };
    }
    if (action === "embeddings" && !payload.input) {
      return {
        status: "error",
        message: "Paramenter 'input' wajib diisi untuk aksi 'embeddings'.",
        data: null
      };
    }
    return await this.request(actionConfig, payload);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const ai = new TogetherAPI();
    const response = await ai.run(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}