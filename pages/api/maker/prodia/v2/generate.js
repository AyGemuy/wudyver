import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    type = 'image',
    prompt = 'A scenic view of mountains during sunset',
    negative_prompt = '',
    steps = '50',
    refiner = 'true',
  } = req.query;

  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing "type" parameter.' });
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing "prompt" parameter.' });
  }

  const config = {
    prompt,
    negative_prompt,
    steps: parseInt(steps, 10),
    refiner: refiner === 'true',
  };

  try {
    const response = await fetch('https://inference.prodia.com/v2/job', {
      method: 'POST',
      headers: {
        Accept: 'image/jpeg',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, config }),
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Failed with status ${response.status}: ${response.statusText}` });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'image/jpeg');
    res.status(200).send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
