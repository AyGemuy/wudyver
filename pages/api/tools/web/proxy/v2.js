// pages/api/raw-text.js
import axios from 'axios';

export default async function handler(req, res) {
  // Cek apakah metode request adalah GET
  if (req.method === 'GET') {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      // Mengambil data raw dari API allorigins
      const response = await axios.get(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`);
      return res.status(200).json({ data: response.data });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch data' });
    }
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}
