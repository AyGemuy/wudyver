import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metode hanya mendukung GET' });
  }

  const { prompt, model = 'gpt-4o-mini', system } = req.query;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt tidak diberikan' });
  }
  const token = Buffer.from('Z2hwXzJXVlJEWW5mUUtKV3FUY2NkbkFXTGtNd05QTG1JZTFFUlhaVA==', 'base64').toString('utf-8');

  try {
    const messages = [
      { role: 'user', content: prompt },
      ...(system ? [{ role: 'system', content: system }] : [])
    ];

    const requestData = {
      model,
      messages
    };

    const response = await axios.post('https://models.inference.ai.azure.com/chat/completions', requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    res.status(200).json({ result: response.data });
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
}
