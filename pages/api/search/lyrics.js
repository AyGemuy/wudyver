import fetch from 'node-fetch';

const sources = [
  (text) => `https://genius.com/api/search/multi?q=${encodeURIComponent(text)}&sort=popularity&text_format=plain&page=1&per_page=5`,
  (text) => `https://notapi.vercel.app/api/lyrics?q=${encodeURIComponent(text)}`,
  (text) => `https://globalapis.onrender.com/api/lyrics?songName=${encodeURIComponent(text)}`,
  (text) => `https://api.textyl.co/api/lyrics?q=${encodeURIComponent(text)}`,
  (text) => `https://king-aryanapis.onrender.com/api/lyrics?songName=${encodeURIComponent(text)}`,
  (text) => `https://lyrist.vercel.app/api/${encodeURIComponent(text)}`,
];

const fetchLyrics = async (url) => {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && Object.keys(data).length) return data;
    }
  } catch {}
  return null;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  const { version = 1, text } = req.query;
  if (!text) return res.status(400).json({ success: false, message: 'Parameter text is required' });

  const index = Math.max(0, Math.min(sources.length - 1, parseInt(version, 10) - 1));
  const urls = [sources[index](text), ...sources.filter((_, i) => i !== index).map((fn) => fn(text))];

  for (const url of urls) {
    const data = await fetchLyrics(url);
    if (data) return res.status(200).json({ success: true, data });
  }

  return res.status(500).json({ success: false, message: 'All sources failed' });
}
