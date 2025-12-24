import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
const VALID_MODELS = ["Claude Sonnet", "Claude Haiku", "o1-mini", "o1", "GPT-4", "GPT-4o", "GPT-4o mini", "Llama 3", "Command R", "Command R+"];
class ApiChat {
  constructor() {
    console.log("Proses: Instance ApiChat dibuat (belum siap digunakan).");
    this.init = axios.create({
      baseURL: "https://playground.spreadsheetsai.app/api/chat",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
        origin: "https://www.datainterpreter.app",
        referer: "https://www.datainterpreter.app/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.api = null;
    this.conversationId = null;
    this.isReady = false;
  }
  async setup() {
    if (this.isReady) {
      console.log("Info: Setup sudah pernah dijalankan.");
      return;
    }
    console.log("Proses: Menjalankan setup untuk mengambil temp_user_id...");
    try {
      const response = await this.init.get("https://playground.spreadsheetsai.app/api/temp_user_id");
      const tempUserId = response.data?.temp_user_id;
      if (!tempUserId) {
        throw new Error("Respons API tidak mengandung temp_user_id yang valid.");
      }
      console.log(`Proses: Berhasil mendapatkan temp_user_id: ${tempUserId}`);
      this.api = axios.create({
        baseURL: "https://playground.spreadsheetsai.app/api/chat",
        headers: {
          "Content-Type": "application/json",
          accept: "*/*",
          origin: "https://www.datainterpreter.app",
          referer: "https://www.datainterpreter.app/",
          "is-demo": tempUserId,
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          ...SpoofHead()
        }
      });
      this.isReady = true;
      console.log("Proses: Instance ApiChat sekarang siap digunakan.");
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Error [setup]: Gagal mengkonfigurasi ApiChat. Detail: ${errorMessage}`);
      throw new Error("Gagal dalam proses setup. Instance tidak dapat digunakan.");
    }
  }
  async initConversation() {
    await this.ensureReady();
    console.log("Proses: Memulai sesi percakapan baru...");
    try {
      const response = await this.api.post("/start", {
        provider: "default",
        server_type: "CPU",
        template_id: null,
        chat_type: null,
        tool_preferences: null,
        conversation_plan: null,
        data_connections: []
      });
      this.conversationId = response.data?.id || null;
      console.log(this.conversationId ? `Proses: Sesi berhasil dimulai dengan ID: ${this.conversationId}` : "Peringatan: Gagal mendapatkan ID percakapan dari API.");
    } catch (error) {
      console.error("Error [initConversation]: Gagal memulai sesi chat.", error.message);
      throw new Error("Gagal menginisialisasi sesi chat.");
    }
  }
  async chat({
    prompt,
    model = 6
  }) {
    await this.ensureReady();
    const modelIndex = parseInt(model, 10);
    if (isNaN(modelIndex) || modelIndex < 0 || modelIndex >= VALID_MODELS.length) {
      const validOptions = VALID_MODELS.map((name, index) => `${index}: ${name}`).join(", ");
      return {
        success: false,
        data: null,
        error: `Indeks model tidak valid. Pilih dari: ${validOptions}`
      };
    }
    const selectedModelName = VALID_MODELS[modelIndex];
    console.log(`Proses: Memulai fungsi chat dengan model [${selectedModelName}] (indeks: ${modelIndex})...`);
    if (!prompt || typeof prompt !== "string") {
      return {
        success: false,
        data: null,
        error: 'Input "prompt" harus berupa string dan tidak boleh kosong.'
      };
    }
    try {
      if (!this.conversationId) {
        await this.initConversation();
        if (!this.conversationId) throw new Error("Inisialisasi percakapan gagal, tidak dapat melanjutkan.");
      }
      const data = {
        message: {
          content: prompt
        },
        provider: "default",
        chat_mode: "auto",
        selectedModels: [selectedModelName]
      };
      const config = {
        headers: {
          "conversation-id": this.conversationId
        }
      };
      const response = await this.api.post("/message", data, config);
      const rawResponse = response.data || "";
      let fullContent = "";
      const metadata = {
        alerts: [],
        messagesInfo: [],
        assistantMessageId: null
      };
      rawResponse.replace(/}\s*{/g, "}\n{").split("\n").forEach(chunk => {
        try {
          const json = JSON.parse(chunk);
          if (json?.content) {
            fullContent += json.content;
          }
          if (json?.alert) {
            metadata.alerts.push({
              type: json.alert,
              details: json
            });
          }
          if (json?.purpose || json?.num_messages) {
            metadata.messagesInfo.push(json);
          }
          if ((json?.role === "assistant" || json?.role === "") && json?.message_id) {
            metadata.assistantMessageId = json.message_id;
          }
        } catch {}
      });
      return {
        success: true,
        data: {
          response: fullContent.trim(),
          modelUsed: selectedModelName,
          conversationId: this.conversationId,
          metadata: metadata
        },
        error: null
      };
    } catch (error) {
      const apiError = error.response?.data?.message || error.message;
      console.error(`Error [chat]: Gagal mengirim pesan. Detail: ${apiError}`);
      return {
        success: false,
        data: null,
        error: apiError
      };
    }
  }
  async ensureReady() {
    if (!this.isReady) {
      await this.setup();
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
    const api = new ApiChat();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}