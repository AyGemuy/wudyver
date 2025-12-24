import axios from "axios";
class MemeGenerator {
  async chat({
    prompt = "Hai",
    image_url,
    system_prompt,
    messages,
    attempts = 1,
    temperature = 1.25,
    detail = "low"
  }) {
    try {
      const requestData = {
        attempts: attempts,
        temperature: temperature,
        messages: messages || [...system_prompt ? [{
          role: "system",
          content: system_prompt
        }] : [], {
          role: "user",
          content: image_url ? [{
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${(await this.getImageBuffer(image_url)).toString("base64")}`,
              detail: detail
            }
          }] : prompt
        }]
      };
      const response = await axios.post("https://www.memecam.io/api/openai", requestData, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
          Referer: "https://www.memecam.io/"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error in chat method:", error.message);
      throw error;
    }
  }
  async getImageBuffer(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error("Error fetching image:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const chatbot = new MemeGenerator();
    const response = await chatbot.chat(params);
    return response ? res.json(response) : res.status(500).json({
      error: "Gagal mengirim prompt"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}