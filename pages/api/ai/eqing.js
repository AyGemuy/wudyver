import fetch from "node-fetch";
class Eqing {
  async token() {
    try {
      const response = await fetch("https://chat.eqing.tech/api/altcaptcha/challenge");
      if (!response.ok) throw new Error("Failed to fetch captcha");
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
  async create(captchaToken, system, model, temperature, top_p, presence_penalty, frequency_penalty, chat_token, messages, stream) {
    const chatData = {
      messages: messages,
      stream: stream || false,
      model: model,
      temperature: temperature,
      presence_penalty: presence_penalty,
      frequency_penalty: frequency_penalty,
      top_p: top_p,
      chat_token: chat_token,
      captchaToken: captchaToken
    };
    try {
      const response = await fetch("https://chat.eqing.tech/api/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-requested-with": "XMLHttpRequest",
          "x-guest-id": "b2kl1QAfu2PzysWPMFbYx",
          accept: "text/event-stream",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Referer: "https://chat.eqing.tech/#/chat"
        },
        body: JSON.stringify(chatData)
      });
      if (!response.ok) throw new Error("Failed to send chat message");
      const data = await response.text();
      return data;
    } catch (error) {
      throw error;
    }
  }
  async chat(model, system, temperature, top_p, presence_penalty, frequency_penalty, chat_token, captchaToken, prompt, stream, history) {
    try {
      const captchaData = await this.token();
      return await this.create(captchaData.salt, system, model, temperature, top_p, presence_penalty, frequency_penalty, chat_token, history, stream);
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    model = "gpt-3.5-turbo",
      temp: temperature = .5,
      top: top_p = 1,
      presence: presence_penalty = 0,
      frequency: frequency_penalty = 0,
      token: chat_token = 64,
      captcha: captchaToken = "",
      prompt = "Hy",
      stream = false,
      system,
      id
  } = req.method === "GET" ? req.query : req.body;
  try {
    const eqing = new Eqing();
    let chatResponse;
    let history = [{
      role: "user",
      content: prompt
    }];
    chatResponse = await eqing.chat(model, system, parseFloat(temperature), parseFloat(top_p), parseFloat(presence_penalty), parseFloat(frequency_penalty), parseInt(chat_token), captchaToken, prompt, stream === "true", history);
    return res.status(200).json({
      result: JSON.parse(chatResponse)
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to process chat request",
      details: error.message
    });
  }
}