import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import CryptoJS from "crypto-js";
class VivyAI {
  constructor() {
    this.encKey = "U2FsdGVkX1/x5DvOqE8wi7B6yPO82CqEP4QCO1fQouOOrByxmH4pfXOn1RJEcY51/evV+EMi9K709MrYdwxUFQ==";
    this.encPass = apiConfig.PASSWORD;
    this.projectId = "romantic-girlfriend---ai-chat";
    this.region = "us-central1";
    this.idToken = null;
    this.apiKey = null;
    this.messageHistory = [{
      role: "system",
      content: "Anda adalah VivyAI, asisten AI yang membantu."
    }];
    this.isInit = false;
  }
  async init() {
    if (!this.isInit) {
      console.log("Memulai inisialisasi VivyAI...");
      try {
        this.apiKey = this.decryptKey();
        if (this.apiKey) {
          await this.login();
          this.isInit = true;
          console.log("Inisialisasi VivyAI selesai.");
        } else {
          console.error("Gagal mendekripsi API Key. Tidak dapat melanjutkan.");
          throw new Error("Gagal inisialisasi: API Key tidak valid.");
        }
      } catch (error) {
        console.error("Kesalahan saat inisialisasi VivyAI:", error);
        throw new Error(`Gagal inisialisasi: ${error.message}`);
      }
    }
  }
  decryptKey() {
    if (!this.encKey) {
      console.warn("this.encKey tidak didefinisikan. Tidak bisa mendekripsi.");
      return null;
    }
    if (!this.encPass) {
      console.error("Password dekripsi (apiConfig.PASSWORD) tidak tersedia.");
      throw new Error("Password dekripsi tidak ditemukan.");
    }
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(this.encKey, this.encPass);
      const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
      console.log("encKey terenkripsi:", this.encKey);
      console.log("Password:", this.encPass);
      console.log("encKey terdekripsi:", decryptedString);
      return decryptedString;
    } catch (error) {
      console.error("Gagal mendekripsi encKey:", error);
      throw new Error(`Kesalahan dekripsi: ${error.message}`);
    }
  }
  async login() {
    console.log("Memulai proses masuk anonim...");
    if (!this.apiKey) {
      throw new Error("API Key belum didekripsi atau tidak tersedia.");
    }
    try {
      const response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.apiKey}`, {
        returnSecureToken: true
      });
      this.idToken = response.data.idToken;
      console.log("Berhasil masuk. Token ID diperoleh.");
      return this.idToken;
    } catch (error) {
      console.error("Kesalahan masuk:", error.response?.data || error.message);
      throw new Error(`Gagal masuk: ${error.message}`);
    }
  }
  async chat({
    prompt,
    messages = [],
    ...rest
  } = {}) {
    await this.init();
    if (!this.idToken) {
      console.warn("ID Token tidak tersedia setelah inisialisasi.");
      throw new Error("Anda harus masuk terlebih dahulu.");
    }
    if (!prompt) throw new Error("Prompt tidak boleh kosong.");
    let conversationContext = [];
    let updateInternalHistory = false;
    if (messages.length > 0) {
      conversationContext = [...messages, {
        role: "user",
        content: prompt
      }];
      console.log("Mengirim pesan dengan riwayat eksternal yang disediakan.");
    } else {
      this.messageHistory.push({
        role: "user",
        content: prompt
      });
      conversationContext = this.messageHistory;
      updateInternalHistory = true;
      console.log("Mengirim pesan dengan memperbarui riwayat internal.");
    }
    try {
      const response = await axios.post(`https://${this.region}-${this.projectId}.cloudfunctions.net/chatWithGPT2`, {
        data: {
          messages: conversationContext,
          ...rest
        }
      }, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.idToken}`
        }
      });
      const aiResponseResult = response.data.result;
      if (!aiResponseResult?.choices?.[0]?.message?.content) {
        console.error("Struktur respons tidak terduga:", JSON.stringify(aiResponseResult, null, 2));
        throw new Error("Struktur respons AI tidak valid.");
      }
      const textResponse = aiResponseResult.choices[0].message.content;
      if (updateInternalHistory) {
        this.messageHistory.push({
          role: "assistant",
          content: textResponse
        });
      }
      console.log("Respons AI diterima.");
      return textResponse;
    } catch (error) {
      console.error("Kesalahan pesan AI:", error.response?.data || error.message);
      throw new Error(`Gagal mengirim pesan ke AI: ${error.message}`);
    }
  }
  getHistory() {
    return [...this.messageHistory];
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
    const ai = new VivyAI();
    const response = await ai.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}