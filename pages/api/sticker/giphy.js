import fetch from "node-fetch";
const GIPHY_API_KEY = "SdX60eTdyvdo0aAyJMQ5u87Qh7mTz7bG";
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
    const response = await fetch(`https://api.giphy.com/v1/gifs/search?q=${query}&api_key=${GIPHY_API_KEY}`);
    const data = await response.json();
    if (all === "true") {
      const result = data.data.map(gif => ({
        title: gif.title,
        url: gif.images.original.mp4
      }));
      return res.status(200).json({
        gifs: result
      });
    }
    if (sticker) {
      const index = parseInt(sticker, 10) - 1;
      if (index >= 0 && index < data.data.length) {
        return res.status(200).json({
          gif: {
            title: data.data[index].title,
            url: data.data[index].images.original.mp4
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
    return res.status(500).json({
      error: "Terjadi kesalahan saat mengambil data dari Giphy."
    });
  }
}