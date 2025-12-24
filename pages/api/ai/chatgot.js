import axios from "axios";
import crypto from "crypto";
class ChatGot {
  constructor() {
    this.apiUrl = "https://api-preview.chatgot.io/api/v1/char-gpt/conversations";
    this.client = axios.create();
    this.headers = {
      accept: "text/event-stream",
      "content-type": "application/json",
      origin: "https://deepseekfree.ai",
      referer: "https://deepseekfree.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/5.37.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/5.37.36"
    };
    this.deviceId = this._generateDeviceId();
    console.log(`✨ Instance ChatGot (for...of Stream) dibuat dengan Device ID: ${this.deviceId}`);
  }
  _generateDeviceId() {
    return crypto.randomBytes(16).toString("hex");
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    console.log(`🚀 Memulai permintaan HTTP Stream (Device ID: ${this.deviceId})`);
    const messageHistory = messages?.length ? [...messages, {
      role: "user",
      content: prompt
    }] : [{
      role: "user",
      content: prompt
    }];
    const payload = {
      device_id: this.deviceId,
      model_id: rest.modelId || 1,
      include_reasoning: rest.includeReasoning ?? true,
      messages: messageHistory
    };
    console.log("📦 Mengirim payload ke API...");
    console.log("💬 Prompt:", prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""));
    return new Promise(async (resolve, reject) => {
      let conversationId = null;
      let finalResult = "";
      let finalReasoning = "";
      let incompleteDataBuffer = "";
      try {
        const response = await this.client.post(this.apiUrl, payload, {
          headers: this.headers,
          responseType: "stream"
        });
        console.log("✅ Respons stream diterima. Memulai parsing dengan for...of...");
        for await (const chunk of response.data) {
          const chunkStr = incompleteDataBuffer + chunk.toString("utf-8");
          incompleteDataBuffer = "";
          const lines = chunkStr.split("\n");
          lines.forEach((line, index) => {
            if (index === lines.length - 1 && line.trim() !== "") {
              incompleteDataBuffer = line;
              return;
            }
            if (!line.startsWith("data:")) return;
            const jsonPart = line.slice(5).trim();
            if (!jsonPart) return;
            try {
              const data = JSON.parse(jsonPart);
              if (data?.code === 201) {
                conversationId = data.data?.c_id;
              }
              if (data?.code === 202) {
                finalResult += data.data?.content || "";
                finalReasoning += data.data?.reasoning_content || "";
              }
            } catch (e) {
              console.warn(`⚠️ Gagal parse JSON dari baris: "${jsonPart.substring(0, 50)}"`);
            }
          });
        }
        console.log("🏁 Stream selesai. Menggabungkan hasil akhir...");
        if (!conversationId) {
          throw new Error("Gagal mendapatkan ID percakapan dari respons API.");
        }
        resolve({
          id: conversationId,
          result: finalResult.trim(),
          reasoning: finalReasoning.trim()
        });
      } catch (error) {
        console.error("❌ Gagal melakukan permintaan atau memproses stream:");
        console.error("   Pesan error:", error.message);
        if (error.response) {
          console.error("   Status:", error.response.status);
        }
        if (error.code) {
          console.error("   Error code:", error.code);
        }
        reject(error);
      }
    });
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
    const api = new ChatGot();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}