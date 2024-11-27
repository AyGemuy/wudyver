import axios from 'axios';

export default async function handler(req, res) {
  try {
    const { waktu, hari, nama, kelas, text, type } = req.query;
    const validType = Math.min(parseInt(type), 14);
    const url = `https://wudysoft-nulis.hf.space/nulis?waktu=${encodeURIComponent(waktu)}&hari=${encodeURIComponent(hari)}&nama=${encodeURIComponent(nama)}&kelas=${encodeURIComponent(kelas)}&text=${encodeURIComponent(text)}&type=${validType}`;
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil gambar.' });
  }
}
