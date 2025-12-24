import axios from "axios";
import https from "https";
import CryptoJS from "crypto-js";
import SpoofHead from "@/lib/spoof-head";
class LLMClient {
  constructor() {
    this.agent = new https.Agent({
      rejectUnauthorized: false
    });
    this.baseConfig = {
      httpsAgent: this.agent,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
        Referer: "https://veo-3-ai.org/nano-banana",
        "Content-Type": "application/json",
        ...SpoofHead()
      }
    };
    this.baseURL = "https://veo-3-ai.org/api";
  }
  encryptToken(token) {
    return CryptoJS.AES.encrypt(token, "sk-sdfs23-gd25135adgdgagaaaag446@#42a55aaaaa").toString();
  }
  generateToken() {
    const timestamp = Date.now().toString();
    return this.encryptToken(timestamp);
  }
  async llm({
    prompt,
    ...rest
  }) {
    try {
      const token = this.generateToken();
      const data = {
        prompts: prompt,
        token: token,
        ...rest
      };
      console.log("Mengirim permintaan LLM...");
      const response = await axios.post(`${this.baseURL}/anyllm`, data, this.baseConfig);
      if (response.data && response.data.request_id) {
        console.log("Permintaan berhasil, request_id:", response.data.request_id);
        return await this.getLLMResult(response.data.request_id, token);
      }
      throw new Error("Gagal mendapatkan request_id dari API LLM");
    } catch (error) {
      console.error("Error dalam panggilan API LLM:", error.message);
      if (error.response) {
        console.error("Detail error response:", error.response.data);
        console.error("Status error:", error.response.status);
      }
      throw error;
    }
  }
  async getLLMResult(requestId, token, maxAttempts = 60, delay = 3e3) {
    console.log(`Memulai polling hasil LLM dengan ID: ${requestId}`);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`Polling attempt ${attempt + 1}/${maxAttempts}`);
        const response = await axios.get(`${this.baseURL}/anyllmGetRes?id=${requestId}&token=${token}`, this.baseConfig);
        if (response.data && response.data.output) {
          console.log("Hasil LLM berhasil didapatkan");
          return response.data;
        }
        if (response.data && response.data.status) {
          console.log(`Status: ${response.data.status}`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        console.error(`Attempt ${attempt + 1} gagal:`, error.message);
        if (attempt === maxAttempts - 1) {
          throw new Error("Maximum attempts reached without getting LLM result");
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error("Maximum attempts reached without getting LLM result");
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
    const llmClient = new LLMClient();
    const response = await llmClient.llm(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}