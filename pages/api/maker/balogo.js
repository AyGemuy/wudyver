import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const { text } = req.query;

    if (!text) return res.status(400).send('Parameter "text" is required.');

    const url = `https://wudysoft-maker.hf.space/balogo?text=${encodeURIComponent(text)}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch the image');

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil gambar.' });
  }
}
