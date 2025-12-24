import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    type
  } = req.method === "GET" ? req.query : req.body;
  if (!type) {
    return res.status(400).json({
      error: 'Paramenter "type" diperlukan'
    });
  }
  const angkaArray = Array.from({
    length: 119
  }, (_, i) => i + 1);
  const audioFiles = angkaArray;
  const isNumeric = !isNaN(type);
  let audioUrl;
  if (isNumeric) {
    const index = parseInt(type);
    if (index >= 0 && index < audioFiles.length) {
      audioUrl = `https://raw.githubusercontent.com/AyGemuy/Sound/main/sound${audioFiles[index]}.mp3`;
    } else {
      return res.status(400).json({
        error: "Angka tidak valid untuk indeks array"
      });
    }
  } else {
    return res.status(400).json({
      error: 'Paramenter "type" harus berupa angka'
    });
  }
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) {
      return res.status(500).json({
        error: "Gagal mengambil file audio"
      });
    }
    const arrayBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mp3");
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("Error fetching audio file:", error);
    res.status(500).json({
      error: "Terjadi kesalahan saat mengambil file audio"
    });
  }
}