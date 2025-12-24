import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper as Wrapper
} from "axios-cookiejar-support";
const jar = new CookieJar();
const client = Wrapper(axios.create({
  jar: jar
}));
const BASE = "https://www.newoaks.ai";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
class NewOaksAI {
  constructor() {
    this.cfg = null;
    this.sessId = null;
  }
  async i(botId = "e0fe725acf4f4df099786d6591e14d8a") {
    console.log("[i] fetching config...");
    try {
      const r = await client.post(`${BASE}/chat/Chatbot/GetConfig`, {
        clientTimeZone: Intl.DateTimeFormat().resolvedOptions.timeZone || "Asia/Jakarta",
        clientCurrentTime: new Date().toISOString().slice(0, 19).replace("T", " "),
        serialNumber: botId
      }, {
        headers: {
          "User-Agent": UA,
          "Content-Type": "application/json",
          Accept: "application/json",
          Origin: "https://www.newoaks.ai",
          Referer: "https://www.newoaks.ai/"
        }
      });
      this.cfg = r.data?.Data ?? null;
      this.sessId = this.cfg?.SessionID ?? null;
      console.log("[i] ok → SessionKey:", !!this.cfg?.SessionKey);
      console.log("[i] SessionID:", this.sessId);
    } catch (e) {
      console.error("[i] error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async chat({
    prompt,
    bot_id = "e0fe725acf4f4df099786d6591e14d8a",
    session_id,
    ...rest
  }) {
    if (!this.cfg) await this.i(bot_id);
    const sid = session_id ?? this.sessId ?? 0;
    console.log(`[chat] → "${prompt}" | sessionID: ${sid}`);
    const headers = {
      "User-Agent": UA,
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      Origin: "https://www.newoaks.ai",
      Referer: "https://www.newoaks.ai/",
      "chatrobot-sessionkey": this.cfg?.SessionKey || "",
      lang: "en"
    };
    try {
      const res = await client.post(`${BASE}/chat/Chat/Ask`, {
        content: prompt,
        sessionID: Number(sid)
      }, {
        headers: headers,
        responseType: "stream"
      });
      let quest_id = null;
      let msg_id = null;
      let full = "";
      const chunks = [];
      return new Promise((resolve, reject) => {
        const onData = chunk => {
          const text = chunk.toString();
          for (const line of text.split("\n").filter(Boolean)) {
            if (!line.startsWith("{")) continue;
            try {
              const j = JSON.parse(line);
              quest_id = j.questionid ?? j.QuestionID ?? quest_id;
              msg_id = j.messageid ?? j.AnswerId ?? j.AnswerID ?? msg_id;
              if (j.sessionid) this.sessId = j.sessionid;
              if (j.content != null) {
                const part = j.content;
                full += part;
                chunks.push(part);
                process.stdout.write(part);
              }
              if (j.TaskCompleted === true) {
                console.log("\n[chat] done");
                resolve({
                  result: full.trim(),
                  quest_id: quest_id,
                  session_id: this.sessId,
                  msg_id: msg_id,
                  content: chunks
                });
              }
            } catch (_) {}
          }
        };
        res.data.on("data", onData);
        res.data.on("end", () => {
          if (!full) reject(new Error("empty response"));
        });
        res.data.on("error", e => {
          console.error("[chat] stream error:", e.message);
          reject(e);
        });
      });
    } catch (e) {
      console.error("[chat] error:", e?.response?.data || e.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new NewOaksAI();
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