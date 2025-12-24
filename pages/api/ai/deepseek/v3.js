import axios from "axios";
import {
  FormData
} from "formdata-node";
class DeepseekChat {
  constructor() {
    this.baseURL = "https://deepseek-portugues.chat/wp-admin/admin-ajax.php";
    this.initialURL = "https://deepseek-portugues.chat/";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "multipart/form-data",
      origin: "https://deepseek-portugues.chat",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://deepseek-portugues.chat/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "mozilla/5.0 (linux; android 10; k) applewebkit/537.36 (khtml, like gecko) chrome/131.0.0.0 mobile safari/537.36"
    };
    this.cookie = "";
    this.nonce = "";
  }
  async getInitialData() {
    try {
      console.log("Mencoba mendapatkan cookie awal...");
      const response = await axios.get(this.initialURL, {
        headers: this.headers
      });
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        this.cookie = Array.isArray(setCookieHeader) ? setCookieHeader.map(cookie => cookie.split(";")[0]).join("; ") : setCookieHeader.split(";")[0];
        console.log("Cookie awal berhasil didapatkan:", this.cookie);
      } else {
        console.log("Tidak ada cookie awal yang diterima.");
      }
    } catch (error) {
      console.error("Gagal mendapatkan data awal:", error);
      throw error;
    }
  }
  async fetchNonce() {
    try {
      console.log("Mencoba mendapatkan nonce...");
      const response = await axios.get(this.initialURL, {
        headers: {
          ...this.headers,
          cookie: this.cookie
        }
      });
      const html = response.data;
      const nonceMatch = html.match(/"nonce":"([^"]+)"/);
      if (nonceMatch && nonceMatch[1]) {
        this.nonce = nonceMatch[1];
        console.log("Nonce berhasil diambil:", this.nonce);
        return;
      }
      throw new Error("Nonce tidak ditemukan di halaman admin-ajax.php");
    } catch (error) {
      console.error("Gagal mendapatkan nonce:", error);
      throw error;
    }
  }
  async sendMessage({
    prompt = "apa kabar?",
    model = "deepseek-ai/DeepSeek-V3",
    attachments = []
  }) {
    try {
      if (!this.cookie) {
        await this.getInitialData();
      }
      if (!this.nonce) {
        await this.fetchNonce();
      }
      const formData = new FormData();
      formData.append("action", "deepseek_chat");
      formData.append("prompt", prompt);
      formData.append("nonce", this.nonce);
      formData.append("model", model);
      formData.append("attachments", JSON.stringify(attachments));
      const response = await axios.post(this.baseURL, formData, {
        headers: {
          ...this.headers,
          cookie: this.cookie,
          ...formData.headers
        }
      });
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        this.cookie = Array.isArray(setCookieHeader) ? setCookieHeader.map(cookie => cookie.split(";")[0]).join("; ") : setCookieHeader.split(";")[0];
        console.log("Cookie diperbarui setelah sendMessage:", this.cookie);
      }
      return response.data;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
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
    const chatClient = new DeepseekChat();
    const response = await chatClient.sendMessage(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}