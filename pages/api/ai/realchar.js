// RealCharAI.js
import WebSocket from 'ws';

class RealCharAI {
  async chat({ prompt, token, name = 'loki', id = '5a0506d1dd2642508d8d67ecff7c0592', language = '', model = 'gpt-3.5-turbo-0125' }) {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(`wss://api.realchar.ai/ws/${id}?llm_model=${model}&platform=web&journal_mode=false&character_id=${name}&language=${language}&token=${token}`);
        let finalResponse = '';
        let capture = false;

        ws.on('open', () => ws.send(prompt));

        ws.on('message', (data) => {
          const msg = data.toString();
          msg.startsWith('[end=') ? ws.close() : capture ? finalResponse += msg : msg.startsWith('[end') && (capture = true);
        });

        ws.on('close', () => resolve({ result: finalResponse }));
        ws.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default async function handler(req, res) {
    const params = req.method === "GET" ? req.query : req.body;

    // Memeriksa apakah prompt ada
    if (!params.prompt) {
      return res.status(400).json({ error: 'Input prompt is required!' });
    }

    const realChar = new RealCharAI();
    try {
      const response = await realChar.chat(params);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Error connecting to WebSocket' });
    }
}