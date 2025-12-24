import axios from "axios";
import CryptoJS from "crypto-js";
class DeepSearch {
  constructor() {
    this.apiKey = "NiIsImtpZCI6I56";
    this.head = {
      headers: {
        "User-Agent": "Android",
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    };
    this.keyApi = axios.create({
      ...this.head,
      baseURL: "https://rotatingkey-qbvg2hl3qq-uc.a.run.app"
    });
    this.chatApi = axios.create({
      ...this.head,
      baseURL: "https://deepseekv2-qbvg2hl3qq-uc.a.run.app"
    });
  }
  async getKey() {
    try {
      const response = await this.keyApi.get("");
      return response.data?.rotatingKey || null;
    } catch (e) {
      console.error("[KEY_ERROR] Gagal mengambil kunci:", e.message);
      return null;
    }
  }
  encKey(rKey) {
    const key = CryptoJS.enc.Utf8.parse(rKey);
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(this.apiKey, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return {
      cipherText: encrypted.toString(),
      ivBase64: CryptoJS.enc.Base64.stringify(iv)
    };
  }
  async chat({
    prompt,
    messages = [],
    model = "deepseek-chat",
    ...rest
  }) {
    try {
      const rKey = await this.getKey();
      if (!rKey) throw new Error("Rotating Key missing");
      const security = this.encKey(rKey);
      const chatMessages = [{
        role: "system",
        content: "You are a helpful assistant."
      }];
      if (messages.length > 0) {
        chatMessages.push(...messages);
      }
      chatMessages.push({
        role: "user",
        content: prompt
      });
      const payload = {
        model: model,
        data: prompt,
        image1: null,
        image2: null,
        secretKey: rKey,
        iv: security.ivBase64,
        messages: chatMessages,
        ...rest
      };
      const requestConfig = {
        headers: {
          Authorization: `Bearer ${security.cipherText}`,
          "Content-Type": "application/json"
        }
      };
      const res = await this.chatApi.post("", payload, requestConfig);
      return res.data?.data || res.data;
    } catch (err) {
      console.error("[API_ERROR]", err.response?.data || err.message);
      return null;
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
  const api = new DeepSearch();
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