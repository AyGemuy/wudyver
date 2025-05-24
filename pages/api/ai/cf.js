import axios from "axios";
class AiCloudflare {
  async sendMessage(input) {
    try {
      const randomNumber = Math.floor(Math.random() * 10) + 1;
      const url = `https://srv.apis${randomNumber}.workers.dev/chat`;
      const messages = Array.isArray(input) ? input : [{
        role: "system",
        content: "Anda adalah Onxy Noir, seorang manusia biasa yang berbicara dengan gaya santai dalam Bahasa Indonesia."
      }, {
        role: "user",
        content: input || "Halo, saya membutuhkan bantuan."
      }];
      const response = await axios.post(url, {
        model: "@cf/meta/llama-3.1-8b-instruct",
        messages: messages
      }, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Referer: "https://google.com/"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    messages
  } = req.method === "GET" ? req.query : req.body;
  const aiCloudflare = new AiCloudflare();
  const userPrompt = prompt || "Halo, saya membutuhkan bantuan.";
  const userMessages = messages || [{
    role: "user",
    content: "Halo, saya membutuhkan bantuan."
  }];
  try {
    const data = await aiCloudflare.sendMessage(userMessages.length ? userMessages : userPrompt);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}