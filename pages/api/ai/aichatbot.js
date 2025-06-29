import crypto from "crypto";
import axios from "axios";
class ChatAPI {
  constructor() {
    this.models = ["gpt-4.1", "gpt-4.1-nano", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini", "o1", "o1-mini", "o3-mini", "o4-mini", "o3", "gpt-4.5-preview", "chatgpt-4o-latest", "gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"];
    this.idToken = null;
    this.deviceId = crypto.randomBytes(32).toString("hex");
    this.subscriberId = "$RCAnonymousID:475151fd351f4d109829a83542725c78";
    this.subscribed = true;
    this.googleIdentityKey = Buffer.from("QUl6YVN5RGNDVm81YWZrUEw0MHNLQmY4ajNaQUNwaURHVTc0eGo0", "base64").toString("utf8");
  }
  async _auth() {
    console.log("Mulai autentikasi...");
    const payload = {
      clientType: "CLIENT_TYPE_ANDROID"
    };
    try {
      const res = await axios.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${this.googleIdentityKey}`, payload, {
        headers: {
          "User-Agent": "TheFUCK/2.1.0 (Windows; U; Android 99; itel Apalo Build/SBY.9SJU9.1909)",
          Connection: "Keep-Alive",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          "Accept-Language": "en-US"
        }
      });
      this.idToken = res.data.idToken;
      console.log("Autentikasi berhasil.");
      return this.idToken;
    } catch (err) {
      console.error("Kesalahan autentikasi:", err.response ? err.response.data : err.message);
      throw new Error(`Autentikasi gagal: ${err.response ? err.response.data.error.message : err.message}`);
    }
  }
  async _checkTrial(token) {
    console.log("Cek status percobaan...");
    const payload = {
      data: {
        deviceid: this.deviceId
      }
    };
    try {
      const res = await axios.post("https://us-central1-aichatbot-d6082.cloudfunctions.net/aichatbotisTrialActive2", payload, {
        headers: {
          "User-Agent": "okhttp/3.12.13",
          "Accept-Encoding": "gzip",
          authorization: `Bearer ${token}`,
          "content-type": "application/json; charset=utf-8"
        }
      });
      console.log("Status percobaan: Aktif:", res.data.result.trialActive);
      return res.data.result.trialActive;
    } catch (err) {
      console.error("Kesalahan cek percobaan:", err.response ? err.response.data : err.message);
      throw new Error(`Cek status percobaan gagal: ${err.response ? err.response.data.error.message : err.message}`);
    }
  }
  async chat({
    prompt = "",
    messages = [],
    model = 0,
    ...rest
  }) {
    let proc = {
      status: "gagal",
      error: null,
      modelDipilih: null,
      auth: "belum_cek",
      trial: "belum_cek",
      reqPayload: null,
      resApi: null,
      resAi: null
    };
    try {
      console.log("Memulai chat...");
      if (typeof model !== "number" || model < 0 || model >= this.models.length) {
        throw new Error(`Indeks model "${model}" tidak valid. Harus antara 0 dan ${this.models.length - 1}.`);
      }
      const modelName = this.models[model];
      proc.modelDipilih = modelName;
      console.log(`Model: ${modelName} (Indeks: ${model})`);
      let finalMsgs = [];
      if (messages.length > 0) {
        finalMsgs = messages;
        console.log("Menggunakan pesan array yang disediakan.");
      } else if (prompt !== "") {
        finalMsgs = [{
          role: "user",
          content: prompt
        }];
        console.log("Menggunakan prompt string untuk membuat pesan.");
      } else {
        throw new Error("Tidak ada prompt atau pesan yang disediakan untuk chat.");
      }
      console.log("Cek autentikasi...");
      if (!this.idToken) {
        proc.auth = "autentikasi";
        await this._auth();
        proc.auth = "terautentikasi";
        proc.trial = "cek";
        await this._checkTrial(this.idToken);
        proc.trial = "selesai";
      } else {
        proc.auth = "sudah_autentikasi";
        console.log("Sudah diautentikasi.");
      }
      if (!this.idToken) {
        throw new Error("Token autentikasi kosong.");
      }
      const reqBody = {
        data: JSON.stringify({
          content: "Hi",
          chatmodel: modelName,
          messages: finalMsgs,
          stream: false,
          deviceid: this.deviceId,
          subscriberid: this.subscriberId,
          subscribed: this.subscribed,
          ...rest
        })
      };
      proc.reqPayload = reqBody;
      console.log("Payload:", reqBody);
      console.log("Kirim permintaan API...");
      const res = await axios.post("https://us-central1-aichatbot-d6082.cloudfunctions.net/aichatbotai2", reqBody, {
        headers: {
          "User-Agent": "okhttp/3.12.13",
          "Accept-Encoding": "gzip",
          authorization: `Bearer ${this.idToken}`,
          "content-type": "application/json; charset=utf-8"
        }
      });
      proc.resApi = res.data;
      console.log("Respons API diterima.");
      if (res.data?.result?.response?.choices?.[0]?.message?.content) {
        proc.resAi = res.data.result.response.choices[0].message.content;
        proc.status = "berhasil";
        console.log("Respons AI:", proc.resAi);
        return proc;
      } else {
        throw new Error("Struktur respons API tidak terduga.");
      }
    } catch (err) {
      proc.status = "gagal";
      proc.error = err.response ? err.response.data : err.message;
      console.error("Kesalahan ChatAPI:", proc.error);
      return proc;
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
    const myChat = new ChatAPI();
    const response = await myChat.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}