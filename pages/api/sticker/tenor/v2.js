import fetch from "node-fetch";
const TENOR_API_KEY = "QUl6YVN5Q0JWYmVHZTRSZTZidlAyTmdlQVZ5SEQ4T1pMd1NjbnJv";
export default async function handler(req, res) {
  const {
    query,
    sticker,
    all
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Paramenter query diperlukan."
    });
  }
  try {
    const decKey = Buffer.from(TENOR_API_KEY, "base64").toString("utf-8");
    const response = await fetch(`https://tenor.googleapis.com/v2/search?q=${query}&key=${decKey}`);
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      return res.status(404).json({
        error: "GIF tidak ditemukan."
      });
    }
    if (all === "true") {
      const result = data.results.map(gif => ({
        title: gif.content_description || "Tidak ada judul",
        url: gif.media_formats.mp4?.url || gif.media_formats.gif?.url || ""
      }));
      return res.status(200).json({
        gifs: result
      });
    }
    if (sticker) {
      const index = parseInt(sticker, 10) - 1;
      if (index >= 0 && index < data.results.length) {
        const gif = data.results[index];
        return res.status(200).json({
          gif: {
            title: gif.content_description || "Tidak ada judul",
            url: gif.media_formats.mp4?.url || gif.media_formats.gif?.url || ""
          }
        });
      }
      return res.status(404).json({
        error: "GIF tidak ditemukan."
      });
    }
    return res.status(400).json({
      error: "Paramenter 'all' atau 'sticker' diperlukan."
    });
  } catch (error) {
    console.error("Error fetching from Tenor:", error);
    return res.status(500).json({
      error: "Terjadi kesalahan saat mengambil data dari Tenor."
    });
  }
}