import axios from "axios";
import {
  FormData
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class SmartChatbotClient {
  constructor() {
    this.apiKey = "AIzaSyAbAjGbC55eqRRtsqIn0isXf1Z7DMX_e4k";
    this.firebaseBaseUrl = "https://identitytoolkit.googleapis.com/v1/accounts";
    this.smartChatbotBaseUrl = "https://bot.smartchatbot.io/assistants/web-main/messages";
    this.tempEmail = null;
    this.idToken = null;
  }
  async createTemporaryEmail() {
    try {
      const response = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      this.tempEmail = response.data.email;
      return response.data;
    } catch (error) {
      console.error("Gagal membuat email sementara:", error.message);
      throw error;
    }
  }
  async signUp(email, password) {
    try {
      const response = await axios.post(`${this.firebaseBaseUrl}:signUp?key=${this.apiKey}`, {
        returnSecureToken: true,
        email: email,
        password: password,
        clientType: "CLIENT_TYPE_WEB"
      }, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID,id;q=0.9",
          "Content-Type": "application/json",
          Origin: "https://www.smartchatbot.io",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "X-Client-Data": "CL3gygE=",
          "X-Client-Version": "Chrome/JsCore/11.6.1/FirebaseCore-web",
          "X-Firebase-Gmpid": "1:738860404831:web:b86e5452bc8d0bb1c80bea"
        }
      });
      this.idToken = response.data.idToken;
      return response.data;
    } catch (error) {
      console.error("Gagal mendaftar:", error.message);
      throw error;
    }
  }
  async sendOobCode(idToken) {
    try {
      const response = await axios.post(`${this.firebaseBaseUrl}:sendOobCode?key=${this.apiKey}`, {
        requestType: "VERIFY_EMAIL",
        idToken: idToken,
        continueUrl: "https://www.smartchatbot.io"
      }, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID,id;q=0.9",
          "Content-Type": "application/json",
          Origin: "https://www.smartchatbot.io",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "X-Client-Data": "CL3gygE=",
          "X-Client-Version": "Chrome/JsCore/11.6.1/FirebaseCore-web",
          "X-Firebase-Gmpid": "1:738860404831:web:b86e5452bc8d0bb1c80bea"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Gagal mengirim kode OOB:", error.message);
      throw error;
    }
  }
  async getEmailVerificationLink(email, timeout = 6e4, interval = 5e3) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const response = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        if (response.data?.data?.length > 0) {
          const content = response.data.data[0].html_content || response.data.data[0].text_content;
          const regex = /https:\/\/webappwoutapp\.firebaseapp\.com\/__\/auth\/action\?mode=verifyEmail&amp;oobCode=([^&]+)/;
          const match = content.match(regex);
          if (match?.[1]) {
            return match[0].replace(/&amp;/g, "&");
          }
        }
      } catch (error) {
        console.error("Kesalahan saat memeriksa email untuk tautan verifikasi:", error.message);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error("Tautan verifikasi tidak ditemukan di email.");
  }
  async verifyEmail(oobCode) {
    try {
      const response = await axios.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccountInfo?key=${this.apiKey}`, {
        oobCode: oobCode
      }, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID,id;q=0.9",
          "Content-Type": "application/json",
          Origin: "https://webappwoutapp.firebaseapp.com",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "X-Client-Data": "CL3gygE=",
          "X-Client-Version": "Chrome/JsCore/3.7.5/FirebaseCore-web"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Gagal memverifikasi email:", error.message);
      throw error;
    }
  }
  async signInWithPassword(email, password) {
    try {
      const response = await axios.post(`${this.firebaseBaseUrl}:signInWithPassword?key=${this.apiKey}`, {
        returnSecureToken: true,
        email: email,
        password: password,
        clientType: "CLIENT_TYPE_WEB"
      }, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID,id;q=0.9",
          "Content-Type": "application/json",
          Origin: "https://www.smartchatbot.io",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "X-Client-Data": "CL3gygE=",
          "X-Client-Version": "Chrome/JsCore/11.6.1/FirebaseCore-web",
          "X-Firebase-Gmpid": "1:738860404831:web:b86e5452bc8d0bb1c80bea"
        }
      });
      this.idToken = response.data.idToken;
      return response.data;
    } catch (error) {
      console.error("Gagal masuk dengan kata sandi:", error.message);
      throw error;
    }
  }
  async registerAndGetIdToken(password = "AyGemuy24") {
    try {
      const emailData = await this.createTemporaryEmail();
      const {
        email: tempEmail
      } = emailData;
      console.log(`Mendaftar dengan email: ${tempEmail}`);
      const signUpResponse = await this.signUp(tempEmail, password);
      const idTokenBeforeVerification = signUpResponse.idToken;
      console.log("Mengirim kode verifikasi OOB...");
      await this.sendOobCode(idTokenBeforeVerification);
      console.log("Menunggu tautan verifikasi email...");
      const verificationLink = await this.getEmailVerificationLink(tempEmail);
      const oobCodeMatch = verificationLink.match(/oobCode=([^&]+)/);
      if (!oobCodeMatch) {
        throw new Error("Gagal mengekstrak oobCode dari tautan verifikasi.");
      }
      const oobCode = oobCodeMatch[1];
      console.log(`Tautan verifikasi ditemukan, oobCode: ${oobCode}`);
      console.log("Memverifikasi email...");
      await this.verifyEmail(oobCode);
      console.log("Masuk kembali untuk mendapatkan idToken terverifikasi...");
      const signInResponse = await this.signInWithPassword(tempEmail, password);
      this.idToken = signInResponse.idToken;
      console.log("Registrasi dan verifikasi berhasil.");
      return this.idToken;
    } catch (error) {
      console.error("Registrasi dan verifikasi gagal:", error.message);
      throw error;
    }
  }
  async chat({
    prompt,
    model = "gpt-4o-mini",
    llm = "openaitest"
  }) {
    try {
      if (!this.idToken) {
        console.log("Token ID tidak ditemukan, melakukan registrasi dan mendapatkan token baru...");
        this.idToken = await this.registerAndGetIdToken("AyGemuy24");
      }
      const formData = new FormData();
      formData.append("assistantType", "web-main");
      formData.append("message", prompt);
      formData.append("model", model);
      formData.append("llm", llm);
      formData.append("isSystemMessage", "false");
      const response = await axios.post(this.smartChatbotBaseUrl, formData, {
        headers: {
          ...formData.headers,
          Accept: "text/event-stream",
          Authorization: `Bearer ${this.idToken}`,
          Origin: "https://www.smartchatbot.io",
          Referer: "https://www.smartchatbot.io/",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "package-name": "chat.woutapp.ai",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        },
        responseType: "text"
      });
      const fullRawResponse = response.data;
      let fullMessage = "";
      const lines = fullRawResponse.split("\n");
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length > 0 && trimmedLine.startsWith("{") && trimmedLine.endsWith("}")) {
          try {
            const parsedObject = JSON.parse(trimmedLine);
            if (parsedObject.message) {
              fullMessage += parsedObject.message;
            }
          } catch (parseError) {
            console.warn("Gagal mengurai baris JSON:", trimmedLine, parseError.message);
          }
        }
      }
      return {
        result: fullMessage
      };
    } catch (error) {
      console.error("Gagal mengirim pesan ke SmartChatbot:", error.message);
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
    const client = new SmartChatbotClient();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}