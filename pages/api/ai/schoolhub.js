import axios from "axios";
import crypto from "crypto";
class SchoolHubAI {
  constructor() {
    this.baseURL = "https://skoleapi-py.midgardai.io";
    this.origin = "https://schoolhub.ai";
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "application/json",
        Origin: this.origin,
        Pragma: "no-cache",
        Referer: `${this.origin}/`,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    });
    console.log("[SchoolHubAI] Client initialized");
  }
  fmt(role, content) {
    return {
      role: role,
      content: content,
      parts: [{
        type: "text",
        text: content
      }]
    };
  }
  parse(data) {
    try {
      console.log("[parse] Parsing...");
      const lines = data?.split("\n")?.filter(l => l) || [];
      const chunks = [];
      for (const line of lines) {
        const trimmed = line?.trim() || "";
        if (trimmed.length > 4) {
          const content = trimmed.slice(3, -1);
          try {
            chunks.push(JSON.parse(`"${content}"`));
          } catch {
            chunks.push(content);
          }
        }
      }
      const result = chunks.join("");
      console.log(`[parse] Parsed ${chunks.length} chunks`);
      return result;
    } catch (error) {
      console.error("[parse] Error:", error?.message || error);
      return data || "";
    }
  }
  async chat({
    prompt,
    messages = [],
    model,
    sessionId,
    ...rest
  }) {
    try {
      console.log("[chat] Starting...");
      const sid = sessionId || rest.sid || crypto.randomUUID();
      const uid = rest.uid || rest.anonymousUserId || crypto.randomUUID();
      const msgs = messages.length ? [...messages] : [this.fmt("system", "Hey there! What can I help you with?"), this.fmt("user", prompt || "Hello")];
      const payload = {
        id: crypto.randomBytes(8).toString("base64url"),
        messages: msgs,
        prompt: "chat-for-students",
        promptType: "sanity",
        locale: "en-US",
        inputs: {},
        sessionId: sid,
        model: model || "gpt-5-mini",
        anonymousUserId: uid,
        ...rest
      };
      console.log(`[chat] Model: ${payload.model}, Session: ${sid}`);
      console.log(`[chat] Messages: ${msgs.length}`);
      const {
        data,
        status
      } = await this.client.post("/chat/", payload);
      console.log("[chat] Done");
      const raw = data || "";
      const result = this.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
      return {
        result: result || raw,
        sessionId: sid,
        anonymousUserId: uid,
        model: payload.model,
        status: status
      };
    } catch (error) {
      console.error("[chat] Error:", error?.message || error);
      console.error("[chat] Details:", error?.response?.data || "N/A");
      throw error;
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
  const api = new SchoolHubAI();
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