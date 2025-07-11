import axios from "axios";
class JazeAI {
  constructor() {
    this.baseUrl = "https://ai.jaze.top/api/auth/workers";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      cookie: "i18n_redirected=zh",
      origin: "https://ai.jaze.top",
      priority: "u=1, i",
      referer: "https://ai.jaze.top/?session=1",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.chatModels = ["@cf/qwen/qwen1.5-14b-chat-awq", "@cf/openchat/openchat-3.5-0106", "@cf/google/gemma-7b-it-lora", "@hf/thebloke/openhermes-2.5-mistral-7b-awq", "@hf/thebloke/neural-chat-7b-v3-1-awq", "@hf/nexusflow/starling-lm-7b-beta", "@cf/meta/llama-3-8b-instruct"];
    this.imageModels = ["@cf/bytedance/stable-diffusion-xl-lightning", "@cf/lykon/dreamshaper-8-lcm", "@cf/stabilityai/stable-diffusion-xl-base-1.0"];
  }
  getModelIndex(list, model) {
    const index = parseInt(model, 10);
    return !isNaN(index) && index >= 1 && index <= list.length ? list[index - 1] : model;
  }
  async requestChat(model, userMessage) {
    const selectedModel = this.getModelIndex(this.chatModels, model);
    if (!this.chatModels.includes(selectedModel)) {
      throw new Error(`Model tidak valid. Pilih dari: ${this.chatModels.join(", ")}`);
    }
    try {
      const payload = {
        model: selectedModel,
        messages: [{
          role: "system",
          content: "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown."
        }, {
          role: "user",
          content: userMessage
        }]
      };
      const response = await axios.post(this.baseUrl, payload, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error requestChat:", error.message);
      throw new Error("Gagal memproses permintaan chat.");
    }
  }
  async requestImage(model, prompt = "Men", numSteps = 20) {
    const selectedModel = this.getModelIndex(this.imageModels, model);
    if (!this.imageModels.includes(selectedModel)) {
      throw new Error(`Model tidak valid. Pilih dari: ${this.imageModels.join(", ")}`);
    }
    try {
      const payload = {
        model: selectedModel,
        messages: [{
          role: "user",
          content: prompt
        }],
        num_steps: numSteps
      };
      const response = await axios.post(`${this.baseUrl}/image`, payload, {
        headers: this.headers,
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      console.error("Error requestImage:", error.message);
      throw new Error("Gagal memproses permintaan gambar.");
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      model = 1,
      prompt = "Halo",
      step: numSteps = 20
    } = req.method === "GET" ? req.query : req.body;
    if (!action) {
      return res.status(400).json({
        error: "Action diperlukan (chat/image)"
      });
    }
    const jazeAI = new JazeAI();
    switch (action) {
      case "chat":
        if (!model || !prompt) {
          return res.status(400).json({
            error: "Model dan prompt diperlukan untuk chat"
          });
        }
        try {
          const chatResponse = await jazeAI.requestChat(model, prompt);
          return res.status(200).json({
            result: chatResponse
          });
        } catch (error) {
          return res.status(500).json({
            error: error.message
          });
        }
      case "image":
        if (!model || !prompt) {
          return res.status(400).json({
            error: "Model dan prompt diperlukan untuk image"
          });
        }
        try {
          const imageResponse = await jazeAI.requestImage(model, prompt, numSteps || 20);
          res.setHeader("Content-Type", "image/png");
          return res.status(200).send(Buffer.from(imageResponse));
        } catch (error) {
          return res.status(500).json({
            error: error.message
          });
        }
      default:
        return res.status(400).json({
          error: "Action tidak valid. Gunakan 'chat' atau 'image'."
        });
    }
  } catch (error) {
    console.error("API Error:", error.message);
    return res.status(500).json({
      error: "Terjadi kesalahan pada server."
    });
  }
}