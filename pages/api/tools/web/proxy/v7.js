import axios from 'axios';

export default async function handler(req, res) {
  const { method, query, body } = req;
  const { url } = query;

  if (!url) return res.status(400).json({ error: 'URL parameter is required' });

  try {
    const response = method === 'GET'
      ? await axios.get(`https://scraper.api.airforce/scrape?url=${encodeURIComponent(url)}`)
      : await axios.post(`https://scraper.api.airforce/scrape?url=${encodeURIComponent(url)}`, body, {
          headers: { 'Content-Type': 'application/json' },
        });

    return res.status(200).json({ output: response.data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
