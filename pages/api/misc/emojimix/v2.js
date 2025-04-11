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
    const [a, b] = emojis;
    const encodedA = encodeURIComponent(a);
    const encodedB = encodeURIComponent(b);
    const stickerUrl = `https://emoji-kitchen-api.vercel.app/mix/${encodedA}/${encodedB}`;
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