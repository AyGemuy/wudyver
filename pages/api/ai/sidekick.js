import axios from "axios";
class SidekickAPI {
  constructor(baseURL = "https://gptsidekick.ai") {
    this.api = axios.create({
      baseURL: baseURL,
      headers: {
        "Content-Type": "application/json"
      }
    });
    this.token = null;
    this.user = null;
    this.autoAuth = true;
  }
  setToken(token) {
    this.token = token;
    if (token) {
      this.api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      console.log("🔑 Token set");
    } else {
      delete this.api.defaults.headers.common["Authorization"];
    }
  }
  setUser(user) {
    this.user = user;
    console.log("👤 User set");
  }
  async ensureAuth() {
    if (!this.token && this.autoAuth) {
      console.log("🔐 Auto-authenticating as guest...");
      await this.guest();
    }
    return !!this.token;
  }
  async guest() {
    try {
      console.log("🎭 Creating guest...");
      const data = {
        name: "Guest",
        email: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 8)}@temporary.aisidekick.local`,
        password: Math.random().toString(36).substr(2, 24),
        terms: true,
        isGuestAccount: true
      };
      data.password_confirmation = data.password;
      const res = await this.register(data);
      console.log("✅ Guest created");
      return res;
    } catch (err) {
      console.error("❌ Guest failed:", err?.response?.data || err.message);
      throw err;
    }
  }
  async register(data) {
    try {
      const res = await this.api.post("/api/app/register", data);
      if (res.data?.success && res.data?.token) {
        this.setToken(res.data.token);
        this.setUser(res.data.user);
      }
      return res.data;
    } catch (err) {
      console.error("❌ Register failed:", err?.response?.data || err.message);
      throw err;
    }
  }
  async stream({
    prompt,
    messages,
    chatId = null,
    useWebSearch = false,
    ...rest
  }) {
    try {
      await this.ensureAuth();
      const msg = messages?.length ? messages[messages.length - 1]?.content || messages[messages.length - 1] : prompt;
      if (!msg) throw new Error("Prompt or messages required");
      let cid = chatId;
      if (!cid || cid === "new") {
        const chatRes = await this.api.post("/api/app/chats", {
          name: msg.substring(0, 50)
        });
        cid = chatRes.data?.chat?.id;
        console.log("✅ Chat created for stream:", cid);
      }
      await this.api.post(`/api/app/chats/${cid}/messages`, {
        message: msg,
        type: "user",
        useWebSearch: useWebSearch
      });
      const url = `${this.api.defaults.baseURL}/api/app/chats/${cid}/stream`;
      const res = await this.api.get(url, {
        params: {
          token: this.token,
          useWebSearch: useWebSearch || undefined
        },
        responseType: "stream",
        adapter: "http"
      });
      return new Promise((resolve, reject) => {
        let content = "";
        res.data.on("data", chunk => {
          try {
            const lines = chunk.toString().split("\n").filter(l => l.trim());
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  console.log("✅ Stream done");
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const text = parsed.data || parsed.content || "";
                  if (text) {
                    content += text;
                  }
                } catch (e) {}
              }
            }
          } catch (err) {
            console.error("❌ Stream parse error:", err.message);
          }
        });
        res.data.on("end", () => {
          console.log("✅ Stream ended");
          resolve({
            result: content,
            chatId: cid,
            success: true
          });
        });
        res.data.on("error", err => {
          console.error("❌ Stream error:", err.message);
          reject(err);
        });
      });
    } catch (err) {
      console.error("❌ Stream failed:", err?.response?.data || err.message);
      throw err;
    }
  }
  disableAutoAuth() {
    this.autoAuth = false;
    console.log("🔓 Auto auth disabled");
  }
  enableAutoAuth() {
    this.autoAuth = true;
    console.log("🔐 Auto auth enabled");
  }
  isAuthenticated() {
    return !!this.token;
  }
  async authenticate() {
    return await this.ensureAuth();
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new SidekickAPI();
  try {
    const data = await api.stream(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}