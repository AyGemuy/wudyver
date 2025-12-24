import fetch from "node-fetch";
const BOT_TOKEN = "891038791:AAHWB1dQd-vi0IbH2NjKYUk-hqQ8rQuzPD4";
async function fetchStickerSet(query) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getStickerSet?name=${encodeURIComponent(query)}`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.result?.stickers || [];
}
async function fetchStickerFile(file_id) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`);
  if (!response.ok) return null;
  const data = await response.json();
  const filePath = data.result?.file_path;
  return filePath ? `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}` : null;
}
export default async function handler(req, res) {
  const {
    query,
    all,
    sticker
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Paramenter query diperlukan."
    });
  }
  const stickers = await fetchStickerSet(query);
  if (all === "true") {
    const result = await Promise.all(stickers.map(async sticker => {
      const fileUrl = await fetchStickerFile(sticker.file_id);
      return {
        ...sticker,
        fileUrl: fileUrl
      };
    }));
    return res.status(200).json({
      stickers: result
    });
  }
  if (sticker) {
    const index = parseInt(sticker, 10) - 1;
    if (index >= 0 && index < stickers.length) {
      const fileUrl = await fetchStickerFile(stickers[index].file_id);
      return res.status(200).json({
        sticker: {
          ...stickers[index],
          fileUrl: fileUrl
        }
      });
    }
    return res.status(404).json({
      error: "Stiker tidak ditemukan."
    });
  }
  return res.status(400).json({
    error: "Paramenter 'all' atau 'sticker' diperlukan."
  });
}