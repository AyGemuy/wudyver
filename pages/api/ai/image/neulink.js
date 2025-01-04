import axios from 'axios';

export default async function handler(req, res) {
  const { prompt } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt tidak boleh kosong' });

  const xak =
    "eyJpdiI6InNKaW5sL0pubTdrd293b3JsUFZEclE9PSIsInZhbHVlIjoiNVNOdnkwS2d1ajZ1eU1XWG1DQnhRRXlIS1lpQ3pvWG9iYXlSc2Jqb3h5am5hNEVSaHhUcFlFVFpidy9oTWs4ZCIsIm1hYyI6IjEyZjIzY2I3Y2Y4ZmMxNTJkZjFjNmNiNzQxZWZlYmJiZTVjMmI0NjJjODg2MmVlMzI2MzJiYmM4ZGNkYTkzNTEiLCJ0YWciOiIifQ==";

  try {
    const response = await axios.get(
      `https://tools.nuelink.com/api/ai/assist?action=IMAGE&prompt=${encodeURIComponent(prompt)}`,
      {
        headers: { Authorization: `Bearer ${xak}` },
        responseType: 'arraybuffer',
      }
    );
    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(Buffer.from(response.data, 'binary'));
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil gambar dari API.' });
  }
}
