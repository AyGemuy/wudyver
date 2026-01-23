import axios from "axios";
class HeckAI {
  constructor() {
    this.base = "https://api.heckai.weight-wave.com";
    this.sid = null;
    this.ax = axios.create({
      baseURL: this.base,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      timeout: 6e4
    });
    this.state = {
      res: {
        answer: "",
        thinking: "",
        sources: [],
        related: []
      },
      ptr: "answer"
    };
  }
  async sess() {
    console.log("🔄 Init Session...");
    try {
      const r = await this.ax.post("/api/ha/v1/session/create", {
        token: ""
      });
      const newSid = r?.data?.id || r?.data?.token || null;
      if (!newSid) throw new Error("No ID received");
      this.sid = newSid;
      console.log(`✅ SID: ${this.sid}`);
      return this.sid;
    } catch (e) {
      console.error("❌ Sess:", e?.message);
      return null;
    }
  }
  async models({
    ...rest
  } = {}) {
    console.log("📡 Fetch Models...");
    try {
      const r = await this.ax.get("/api/ha/v1/app/config", {
        ...rest
      });
      return r?.data?.models ?? [];
    } catch (e) {
      console.error("❌ Models:", e?.message);
      return [];
    }
  }
  async chat({
    prompt,
    sid,
    mode = "chat",
    ...rest
  }) {
    this.sid = sid || this.sid || await this.sess();
    if (!this.sid) return console.error("❌ Abort: No Session ID");
    this.state.res = {
      answer: "",
      thinking: "",
      sources: [],
      related: []
    };
    this.state.ptr = "answer";
    const ep = mode === "search" ? "/api/ha/v1/search" : "/api/ha/v1/chat";
    const body = {
      model: "openai/gpt-4o-mini",
      sessionId: this.sid,
      stream: true,
      question: prompt,
      query: prompt,
      ...mode === "search" ? {
        api_key: "basic",
        search_depth: "basic",
        include_answer: true,
        include_raw_content: true,
        include_images: false
      } : {},
      ...rest
    };
    console.log(`🚀 [${mode.toUpperCase()}] ${body.model} > "${prompt.slice(0, 30)}..."`);
    try {
      const r = await this.ax.post(ep, body, {
        responseType: "stream",
        headers: {
          Accept: "text/event-stream"
        }
      });
      const stream = r.data;
      let buf = "";
      stream.on("data", c => {
        buf += c.toString();
        let parts = buf.split("\n");
        buf = parts.pop() ?? "";
        parts.forEach(line => this.proc(line));
      });
      return new Promise((resolve, reject) => {
        stream.on("end", () => {
          if (buf.trim()) this.proc(buf);
          console.log("\n🏁 Done.");
          resolve({
            ...this.state.res
          });
        });
        stream.on("error", e => reject(e));
      });
    } catch (e) {
      console.error("❌ Chat Err:", e?.response?.status || e?.message);
      return null;
    }
  }
  proc(line) {
    if (!line || line.length === 0) return;
    const str = line.trim();
    if (this.setMode(str)) return;
    if (line.length >= 5 && line.slice(0, 5) === "data:") {
      let raw = line.slice(5);
      if (raw.length > 0 && raw[0] === " ") raw = raw.slice(1);
      if (raw.trim() === "[DONE]") return;
      try {
        const data = JSON.parse(raw);
        this.push(data);
      } catch {
        this.push(raw);
      }
    } else if (str.startsWith("{") || str.startsWith("[")) {
      try {
        this.push(JSON.parse(str));
      } catch {}
    }
  }
  setMode(str) {
    const flags = {
      "[ANSWER_START]": ["answer", "\n💡 ANSWER:\n"],
      "[REASON_START]": ["thinking", "\n🤔 THINKING:\n"],
      "[SOURCE_START]": ["sources", "\n📚 SOURCES:\n"],
      "[RELATE_Q_START]": ["related", "\n🔗 RELATED:\n"]
    };
    for (const k in flags) {
      if (str.indexOf(k) !== -1) {
        this.state.ptr = flags[k][0];
        process.stdout.write(flags[k][1]);
        return true;
      }
    }
    if (str.indexOf("_DONE]") !== -1) return true;
    return false;
  }
  push(d) {
    if (Array.isArray(d)) {
      this.state.res.sources = [...this.state.res.sources, ...d];
      d.forEach((x, i) => {
        if (x?.title) console.log(`  - ${x.title.slice(0, 50)}...`);
      });
      return;
    }
    const txt = d?.choices?.[0]?.delta?.content || d?.result || d?.content || (typeof d === "string" ? d : "");
    if (txt) {
      const p = this.state.ptr;
      if (p === "related") {
        const clean = txt.trim();
        if (clean && clean !== "✩") {
          this.state.res.related.push(clean);
          process.stdout.write(txt);
        }
      } else if (p !== "sources") {
        this.state.res[p] += txt;
        process.stdout.write(txt);
      }
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi",
      actions: ["models", "chat"]
    });
  }
  const api = new HeckAI();
  try {
    let result;
    switch (action) {
      case "models":
        result = await api.models(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'",
            example: {
              action: "chat",
              prompt: "Hello!"
            }
          });
        }
        result = await api.chat(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["models", "chat"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}