import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class GPTModel {
  constructor() {
    this.baseUrl = "https://stablediffusion.fr";
  }
  async _predict(endpoint, referer, prompt) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: this.baseUrl,
      priority: "u=1, i",
      referer: referer,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    const data = {
      prompt: prompt
    };
    try {
      console.log(`Mengirim permintaan ke ${url}...`);
      const response = await axios.post(url, data, {
        headers: headers
      });
      console.log("Berhasil mendapatkan respons.");
      return response.data;
    } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error(`Gagal melakukan request ke ${url}: ${errorMessage}`);
      throw new Error(`Request gagal: ${errorMessage}`);
    }
  }
  async gpt4(prompt) {
    console.log("Memulai proses GPT-4...");
    return await this._predict("/gpt4/predict2", "https://stablediffusion.fr/chatgpt4", prompt);
  }
  async gpt3(prompt) {
    console.log("Memulai proses GPT-3...");
    return await this._predict("/gpt3/predict", "https://stablediffusion.fr/chatgpt3", prompt);
  }
  async generate({
    prompt,
    model = "gpt4"
  }) {
    if (!prompt) {
      throw new Error("Paramenter 'prompt' wajib diisi.");
    }
    console.log(`Memulai generate dengan model: ${model}`);
    if (model === "gpt4") {
      return await this.gpt4(prompt);
    } else if (model === "gpt3") {
      return await this.gpt3(prompt);
    } else {
      throw new Error(`Model '${model}' tidak dikenali. Gunakan 'gpt4' atau 'gpt3'.`);
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
    const gpt = new GPTModel();
    const response = await gpt.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}