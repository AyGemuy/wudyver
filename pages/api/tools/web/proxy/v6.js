import axios from 'axios';

export default async function handler(req, res) {
  const { method, body, query } = req;

  let payload;

  if (method === 'POST') {
    payload = {
      url: body.url,
      method: body.method,
      body: body.body || null
    };
  } else if (method === 'GET') {
    payload = {
      url: query.url,
      method: query.method || 'get',
      body: query.body || null
    };
  } else {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const response = await axios.post('https://localplexity-proxy-cors-buster.legraphista.workers.dev/', payload, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://localplexity.pages.dev/'
      }
    });

    return res.status(200).json({ result: response.data });
  } catch (error) {
    return res.status(500).json({ message: 'Error occurred', error: error.message });
  }
}
