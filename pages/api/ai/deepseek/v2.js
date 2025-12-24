import axios from "axios";
import crypto from "crypto";
class FutureChat {
  constructor(options = {}) {
    this.url = "https://qfjcjtsklspbzxszcwmf.supabase.co/functions/v1/proxyDeepSeek";
    this.headers = {
      "X-Client": "Postify-Future/1.0",
      "Content-Type": "application/json"
    };
    this.sessions = new Map();
    this.maxHistory = options.maxMessages ?? 100;
    this.sessionTimeout = options.expiry ?? 108e5;
    this.cleanupInterval = options.cleanupInterval ?? 18e5;
    this.defaultModel = options.model ?? "deepseek-r1-distill-llama-70b";
    this.defaultTemperature = options.temperature ?? .9;
    this.defaultMaxTokens = options.max_tokens ?? 1024;
    this.defaultTopP = options.top_p ?? .95;
    this.initSessionCleanup();
  }
  uuid() {
    return crypto.randomBytes(16).toString("hex");
  }
  initSessionCleanup() {
    setInterval(() => {
      this.cleanSessions();
    }, this.cleanupInterval);
  }
  cleanSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActive > this.sessionTimeout) {
        this.sessions.delete(id);
        console.log(`Session ${id} tamat dan dibersihkan.`);
      }
    }
  }
  async send(input) {
    const {
      prompt,
      messages,
      chatId,
      think = false,
      model = this.defaultModel,
      temperature = this.defaultTemperature,
      max_tokens = this.defaultMaxTokens,
      top_p = this.defaultTopP
    } = input;
    const userPrompt = prompt?.trim();
    const hasPrompt = !!userPrompt;
    const hasMessages = Array.isArray(messages) && messages.length > 0;
    if (!hasPrompt && !hasMessages) {
      console.error("Ralat: Tiada input diberikan (prompt atau messages).");
      return {
        success: false,
        code: 400,
        result: {
          error: "Mana pesannya bro??"
        }
      };
    }
    if (think !== undefined && typeof think !== "boolean") {
      console.error('Ralat: Paramenter "think" tidak sah.');
      return {
        success: false,
        code: 400,
        result: {
          error: "'think' mesti boolean."
        }
      };
    }
    const sessionId = chatId || this.uuid();
    const sessionData = this.sessions.get(sessionId) || {
      messages: []
    };
    const history = sessionData.messages;
    const systemMessage = {
      role: "system",
      content: `Anda ialah AI termaju, menyalurkan gaya santai Indonesia dengan respons pantas dan bijak serta sentuhan slanga Aussie. Pastikan ringkas (maks 3 ayat), gunakan slanga dan emoji, ingat sejarah sembang, dan huraikan topik kompleks dengan analogi yang mudah difahami. Bahasa formal? Tak payah, santai je macam bersembang dengan kawan baik anda. Semua respons dalam Bahasa Indonesia!`
    };
    const newMessages = hasPrompt ? [...history, {
      role: "user",
      content: userPrompt
    }] : messages;
    const payloadMessages = [systemMessage, ...newMessages].map(({
      role,
      content
    }) => ({
      role: role,
      content: content
    }));
    try {
      console.log(`[${sessionId}] Menghantar permintaan dengan model: ${model}, suhu: ${temperature}, max_tokens: ${max_tokens}, top_p: ${top_p}`);
      const response = await axios.post(this.url, {
        model: model,
        messages: payloadMessages,
        temperature: temperature,
        max_tokens: max_tokens,
        top_p: top_p,
        stream: false
      }, {
        headers: this.headers
      });
      const aiResponseContent = response.data?.choices?.[0]?.message?.content;
      const result = think ? aiResponseContent : aiResponseContent?.replace(/<\/?think>/g, "").trim() ?? "";
      const assistantMessage = {
        role: "assistant",
        content: result,
        timestamp: Date.now()
      };
      const updatedHistory = hasPrompt ? [...history, {
        role: "user",
        content: userPrompt,
        timestamp: Date.now()
      }, assistantMessage].slice(-this.maxHistory) : [...messages || [], assistantMessage].slice(-this.maxHistory);
      this.sessions.set(sessionId, {
        messages: updatedHistory,
        lastActive: Date.now()
      });
      const isNew = !history.length;
      const isFollowUp = !isNew;
      const expiryTime = new Date(Date.now() + this.sessionTimeout).toISOString();
      const msgCount = updatedHistory.length;
      console.log(`[${sessionId}] Respons diterima.`);
      return {
        success: true,
        code: 200,
        result: result,
        chatId: sessionId,
        sessionExpiry: expiryTime,
        messageCount: {
          current: msgCount,
          max: this.maxHistory
        },
        isNewSession: isNew,
        isFollowUp: isFollowUp,
        think: think,
        model: model,
        temperature: temperature,
        max_tokens: max_tokens,
        top_p: top_p
      };
    } catch (error) {
      console.error(`[${sessionId}] Ralat memproses sembang:`, error.message, error.response?.data);
      const errorCode = error.response?.status || 500;
      return {
        success: false,
        code: errorCode,
        result: {
          error: error.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.prompt) {
      return res.status(400).json({
        success: false,
        message: "Prompt diperlukan."
      });
    }
    const bot = new FutureChat();
    const result = await bot.send(params);
    return res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: "Terjadi kesalahan.",
      error: err.message
    });
  }
}