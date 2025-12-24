import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import {
  v4 as uuidv4
} from "uuid";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class AIChatClient {
  constructor() {
    this.CHAT_URL_INIT = "https://use.ai/id/chat";
    this.CHAT_URL_API = "https://use.ai/v1/chat";
    this.USER_AGENT = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      timeout: 6e4,
      headers: {
        "User-Agent": this.USER_AGENT,
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        ...SpoofHead()
      }
    }));
    this.sessionId = null;
    this.chatId = null;
  }
  _randomHex(len) {
    return crypto.randomBytes(len / 2).toString("hex");
  }
  async _initSession() {
    if (this.sessionId) return;
    console.log("[INIT] Mengambil session & cookie...");
    const res = await this.client.get(this.CHAT_URL_INIT, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document"
      },
      maxRedirects: 5
    });
    const cookies = await this.jar.getCookies("https://use.ai");
    const sessionCookie = cookies.find(c => c.key.includes("session") || c.key === "use_ai_session");
    this.sessionId = sessionCookie ? sessionCookie.value : null;
    if (!this.chatId) {
      this.chatId = uuidv4();
    }
    console.log("[INIT] Session ID:", this.sessionId?.slice(0, 20) + "...");
    console.log("[INIT] Chat ID:", this.chatId);
  }
  async chat({
    prompt,
    chat_id,
    model = "gateway-gpt-4o"
  }) {
    if (!prompt) throw new Error("Prompt wajib diisi");
    await this._initSession();
    const messageId = uuidv4();
    const traceId = this._randomHex(32);
    const spanId = this._randomHex(16);
    const sampledRand = Math.random().toFixed(17).slice(2);
    const baggage = `sentry-environment=production,sentry-release=${this._randomHex(40)},sentry-public_key=905ff2a259425fa7167e7994687e7056,sentry-trace_id=${traceId},sentry-org_id=4509668407246848,sentry-sampled=false,sentry-sample_rand=0.${sampledRand},sentry-sample_rate=0.01`;
    const headers = {
      Accept: "*/*",
      "Content-Type": "application/json",
      Origin: "https://use.ai",
      Referer: `https://use.ai/id/chat/${chat_id || this.chatId}`,
      baggage: baggage,
      "sentry-trace": `${traceId}-${spanId}-1`,
      "x-use-ai-session-id": this.sessionId,
      "sec-ch-ua": `"Chromium";v="127", "Not)A;Brand";v="99"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      priority: "u=1, i"
    };
    const payload = {
      chatId: chat_id || this.chatId,
      message: {
        parts: [{
          type: "text",
          text: prompt
        }],
        id: messageId,
        role: "user"
      },
      selectedChatModel: model,
      selectedVisibilityType: "private",
      retryLastMessage: false
    };
    console.log(`[CHAT] Mengirim: "${prompt.slice(0, 50)}..."`);
    const response = await this.client.post(this.CHAT_URL_API, payload, {
      headers: headers,
      responseType: "stream"
    });
    let fullText = "";
    let aiMessageId = null;
    return new Promise((resolve, reject) => {
      response.data.on("data", chunk => {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            resolve({
              result: fullText.trim(),
              chat_id: chat_id || this.chatId,
              message_id: aiMessageId,
              model: model
            });
            return;
          }
          try {
            const json = JSON.parse(data);
            if (json.type === "text-start") {
              aiMessageId = json.id;
            } else if (json.type === "text-delta" && json.id === aiMessageId) {
              fullText += json.delta;
              process.stdout.write(json.delta);
            }
          } catch {}
        }
      });
      response.data.on("error", err => reject(err));
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AIChatClient();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}