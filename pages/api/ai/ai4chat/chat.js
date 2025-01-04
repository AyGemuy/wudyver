import fetch from 'node-fetch';

class RiddleGenerator {
  constructor() {
    this.headers = {
      'Accept': '*/*',
      'Accept-Language': 'id-ID,id;q=0.9',
      'Origin': 'https://www.ai4chat.co',
      'Priority': 'u=1, i',
      'Referer': 'https://www.ai4chat.co/',
      'Sec-CH-UA': '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      'Sec-CH-UA-Mobile': '?1',
      'Sec-CH-UA-Platform': '"Android"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    };
  }

  async generateRiddle(text, country = 'Asia', userId = 'usersmjb2oaz7y') {
    try {
      const response = await fetch(`https://yw85opafq6.execute-api.us-east-1.amazonaws.com/default/boss_mode_15aug?text=${encodeURIComponent(text)}&country=${encodeURIComponent(country)}&user_id=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: this.headers,
      });

      const result = await response.text();
      return result;
    } catch (error) {
      throw new Error('Error generating riddle: ' + error.message);
    }
  }
}

export default async function handler(req, res) {
  try {
    const { prompt: text, country, userId } = req.method === "GET" ? req.query : req.body;
    if (!text) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const generator = new RiddleGenerator();
    const response = await generator.generateRiddle(text, country, userId);

    return res.status(200).json({ result: response });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
