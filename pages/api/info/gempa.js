import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { type = 'auto' } = req.query;
  const urls = {
    auto: 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json',
    terkini: 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json',
    dirasakan: 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json',
  };
  const url = urls[type];
  if (!url) {
    return res.status(400).json({
      status: 'error',
      message: `Tipe "${type}" tidak valid. Gunakan salah satu dari: auto, terkini, dirasakan.`,
    });
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({
        status: 'error',
        message: `Gagal mengambil data dari BMKG: ${response.statusText}`,
      });
    }
    const data = await response.json();
    res.status(200).json({ status: 'success', type, data });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memproses permintaan.',
      error: error.message,
    });
  }
}
