import axios from 'axios';

export default async function handler(req, res) {
  const { prompt = 'Cars', nologo = 1, seed = 999, height = 1920, width = 1080, w = 3840, q = 100 } = req.method === "GET" ? req.query : req.body;

  try {
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=${nologo}&seed=${seed}&height=${height}&width=${width}&w=${w}&q=${q}`;
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    res.setHeader('Content-Type', 'image/png');
    res.send(Buffer.from(response.data, 'binary'));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch image', details: error.message });
  }
}
