import crypto from "crypto";
import {
  v4 as uuidv4
} from "uuid";
import axios from "axios";
class ConciseAI {
  apiBaseUrl = "https://toki-41b08d0904ce.herokuapp.com/api/conciseai/chat";
  signatureSecret = "CONSICESIGAIMOVIESkjkjs32120djwejk2372kjsajs3u293829323dkjd8238293938wweiuwe";
  axiosInstance;
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        "User-Agent": "okhttp/4.10.0",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
  }
  generateSignature(inputString, key) {
    try {
      const hmac = crypto.createHmac("sha256", this.signatureSecret);
      hmac.update(key + inputString + "normal");
      return hmac.digest("hex");
    } catch (e) {
      console.error("Kesalahan saat menghasilkan tanda tangan:", e);
      return null;
    }
  }
  formatMessages(messages) {
    return messages.map(msg => {
      const role = msg.role.toUpperCase();
      return `${role}: ${msg.content}`;
    }).join("\n");
  }
  async chat({
    prompt,
    messages
  }) {
    let finalMessagesArray;
    if (messages && messages.length > 0) {
      finalMessagesArray = messages;
    } else if (prompt) {
      finalMessagesArray = [{
        role: "user",
        content: prompt
      }];
    } else {
      throw new Error("Harus menyediakan 'prompt' atau 'messages' dengan konten.");
    }
    const messageToSend = this.formatMessages(finalMessagesArray);
    const user_id = uuidv4().replaceAll("-", "");
    const signature = this.generateSignature(messageToSend, user_id);
    const data = new URLSearchParams();
    data.append("question", messageToSend);
    data.append("conciseaiUserId", user_id);
    data.append("signature", signature);
    data.append("previousChats", JSON.stringify([{
      a: "",
      b: messageToSend,
      c: false
    }]));
    data.append("model", "normal");
    try {
      const response = await this.axiosInstance.post("", data.toString());
      if (response.status !== 200) {
        throw new Error(`Permintaan API gagal dengan status: ${response.status} - ${response.statusText}`);
      }
      return {
        result: response.data.answer || "Tidak ada pesan yang ditemukan."
      };
    } catch (error) {
      console.error("Kesalahan selama panggilan API obrolan:", error.message);
      throw new Error(`Gagal mendapatkan respons dari AI: ${error.message}`);
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
    const conciseAI = new ConciseAI();
    const response = await conciseAI.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}