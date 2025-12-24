import fetch from "node-fetch";
const TENOR_API_KEY = "NX2ZM22Q1B3I";
export default async function handler(req, res) {
  const {
    query,
    sticker,
    all,
    type = "g"
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Paramenter query diperlukan."
    });
  }
  try {
    const response = await fetch(`https://${type}.tenor.com/v1/search?q=${query}&key=${TENOR_API_KEY}`);
    const data = await response.json();
    if (all === "true") {
      const result = data.results.map(gif => ({
        title: gif.title,
        url: gif.media[0]?.mp4.url || ""
      }));
      return res.status(200).json({
        gifs: result
      });
    }
    if (sticker) {
      const index = parseInt(sticker, 10) - 1;
      if (index >= 0 && index < data.results.length) {
        return res.status(200).json({
          gif: {
            title: data.results[index].title,
            url: data.results[index].media[0]?.mp4.url || ""
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
      error: "Terjadi kesalahan saat mengambil data dari Tenor."
    });
  }
}