import fetch from "node-fetch";

class Eqing {
  async token() {
    const response = await fetch('https://chat.eqing.tech/api/altcaptcha/challenge');
    if (!response.ok) throw new Error('Failed to fetch captcha');
    return await response.json();
  }

  async create(captchaToken, system, model, temperature, top_p, presence_penalty, frequency_penalty, chat_token, prompt, stream) {
    const chatData = {
      messages: [
        { role: "system", content: system || "AI" },
        { role: "user", content: prompt || "kuy" }
      ],
      stream: stream || false,
      model,
      temperature,
      presence_penalty,
      frequency_penalty,
      top_p,
      chat_token,
      captchaToken
    };

    const response = await fetch('https://chat.eqing.tech/api/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-requested-with': 'XMLHttpRequest',
        'x-guest-id': 'b2kl1QAfu2PzysWPMFbYx',
        'accept': 'text/event-stream',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://chat.eqing.tech/#/chat'
      },
      body: JSON.stringify(chatData)
    });

    if (!response.ok) throw new Error('Failed to send chat message');

    const data = await response.text();
    
    return data;
  }

  async chat(model, system, temperature, top_p, presence_penalty, frequency_penalty, chat_token, captchaToken, prompt, stream) {
    const captchaData = await this.token();
    return await this.create(captchaData.salt, system, model, temperature, top_p, presence_penalty, frequency_penalty, chat_token, prompt, stream);
  }
}

export default async function handler(req, res) {
  const { model = 'gpt-4o-mini', temperature = 0.5, top_p = 1, presence_penalty = 0, frequency_penalty = 0, chat_token = 64, captchaToken = '', prompt = 'Hy', stream = false, system } = req.query;

  if (req.method === 'GET') {
    try {
      const eqing = new Eqing();
      const chatResponse = await eqing.chat(model, system, parseFloat(temperature), parseFloat(top_p), parseFloat(presence_penalty), parseFloat(frequency_penalty), parseInt(chat_token), captchaToken, prompt, stream === 'true');
      return res.status(200).json({ result: chatResponse });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to process chat request' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
