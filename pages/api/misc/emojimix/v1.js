import axios from "axios";
import emojiRegex from "emoji-regex";
export default async function handler(req, res) {
  const {
    emoji
  } = req.method === "GET" ? req.query : req.body;
  if (!emoji) {
    return res.status(400).json({
      success: false,
      message: "Emoji tidak ditemukan."
    });
  }
  const regex = emojiRegex();
  const emojis = emoji.match(regex);
  if (!emojis || emojis.length < 2) {
    return res.status(400).json({
      success: false,
      message: "Harus ada dua emoji."
    });
  }
  try {
    const [encodedA, encodedB] = emojis;
    const decKey = Buffer.from("QUl6YVN5QXlpbWt1WVFZRl9GWFZBTGV4UHVHUWN0VVdSVVJkQ1lR", "base64").toString("utf-8");
    const {
      data
    } = await axios.get(`https://tenor.googleapis.com/v2/featured`, {
      params: {
        key: decKey,
        contentfilter: "high",
        media_filter: "png_transparent",
        component: "proactive",
        collection: "emoji_kitchen_v5",
        q: `${encodedA}_${encodedB}`
      }
    });
    const stickerUrl = data?.results?.[0]?.media_formats?.png_transparent?.url;
    if (!stickerUrl) return res.status(404).json({
      success: false,
      message: "No sticker found."
    });
    const {
      data: stickerData
    } = await axios.get(stickerUrl, {
      responseType: "arraybuffer"
    });
    res.setHeader("Content-Type", "image/png");
    return res.send(Buffer.from(stickerData));
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}