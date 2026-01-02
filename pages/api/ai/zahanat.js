import axios from "axios";
import crypto from "crypto";
class Zahanat {
  constructor() {
    this.api = "https://api.zahanat.ai/api";
    this.chatApi = "https://api.zahanat.ai/conversation";
    this.token = null;
    this.user = null;
    this.http = axios.create({
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Origin: "https://chat.zahanat.ai",
        Referer: "https://chat.zahanat.ai/"
      }
    });
  }
  log(m, d = "") {
    console.log(`[LOG] ${m}`, d);
  }
  gen() {
    const salt = crypto.randomBytes(3).toString("hex");
    const stamp = Date.now().toString().slice(-4);
    const genders = ["Male", "Female"];
    const year = new Date().getFullYear() - (Math.floor(Math.random() * 22) + 18);
    const dob = `${year}-0${Math.floor(Math.random() * 9) + 1}-01`;
    return {
      email: `user${salt}${stamp}@mail.com`,
      password: `Pass${crypto.randomBytes(4).toString("hex")}!`,
      name: `User${salt}`,
      dob: dob,
      gender: genders[Math.floor(Math.random() * genders.length)]
    };
  }
  async reg(email, password, name, dob, gender) {
    try {
      this.log("Registering...");
      const res = await this.http.post(`${this.api}/signup/`, {
        name: name || "AI User",
        email: email,
        dob: dob || "1995-05-05",
        gender: gender || "Male",
        password: password,
        confirmPassword: password,
        privacyPolicy: true
      });
      const code = res.data?.verification_code;
      if (!code) throw new Error("No OTP");
      this.log("Verifying code:", code);
      await this.http.post(`${this.api}/verify-email/`, {
        email: email,
        code: code,
        type: "email"
      });
      return true;
    } catch (e) {
      this.log("Reg Error:", e.response?.data || e.message);
      return false;
    }
  }
  async auth(email, password) {
    try {
      this.log("Logging in...");
      const res = await this.http.post(`${this.api}/login/`, {
        email: email,
        password: password
      });
      this.token = res.data?.token || null;
      this.user = res.data?.user || null;
      return !!this.token;
    } catch (e) {
      this.log("Auth Failed");
      return false;
    }
  }
  async chat({
    email,
    password,
    prompt,
    messages = [],
    ...rest
  }) {
    try {
      const data = email && password ? {
        email: email,
        password: password
      } : this.gen();
      const userMsg = prompt || "Hi";
      if (!this.token) {
        const isReg = await this.reg(data.email, data.password, data.name, data.dob, data.gender);
        if (!isReg) throw new Error("Reg Failed");
        const isAuth = await this.auth(data.email, data.password);
        if (!isAuth) throw new Error("Auth Failed");
      }
      messages.push({
        role: "user",
        message: userMsg
      });
      this.log("Chatting...");
      const res = await this.http.post(`${this.chatApi}/messagesV1/`, {
        user_id: this.user?.id,
        sender: "user",
        message: userMsg,
        new_conversation: rest.conversation_id ? false : true,
        conversation_id: rest.conversation_id || 0,
        web_search: rest.web_search ?? true
      }, {
        headers: {
          Authorization: `Token ${this.token}`
        },
        responseType: "text"
      });
      const rawChunks = res.data.split("\n");
      let fullText = "";
      let meta = {};
      for (const line of rawChunks) {
        if (line.startsWith("data: ")) {
          const json = JSON.parse(line.substring(6));
          fullText += json.chunk || "";
          if (json.status === 201) meta = json;
        }
      }
      messages.push({
        role: "assistant",
        message: fullText
      });
      return {
        result: fullText,
        email: data.email,
        password: data.password,
        ...meta
      };
    } catch (e) {
      this.log("Process Error:", e.message);
      return {
        error: true,
        result: e.message
      };
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
  const api = new Zahanat();
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