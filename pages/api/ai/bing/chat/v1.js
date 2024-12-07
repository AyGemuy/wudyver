// pages/api/bingai.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Parameter "q" diperlukan.' });
  }

  try {
    const response = await fetch(`https://loco.web.id/wp-content/uploads/api/v1/bingai.php?q=${encodeURIComponent(q)}`);
    if (!response.ok) throw new Error(`Gagal fetch data: ${response.statusText}`);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
