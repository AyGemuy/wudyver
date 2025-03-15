import axios from "axios";
import emojiRegex from "emoji-regex";
class Emojimix {
  async create(emojiInput = "😀😂") {
    const regex = emojiRegex();
    const emojis = emojiInput.match(regex);
    if (!emojis || emojis.length < 2) {
      return {
        error: "Harus ada dua emoji."
      };
    }
    const c = emoji => "u" + emoji.codePointAt(0).toString(16).padStart(4, "0");
    const api = (e1, e2, v) => `https://www.gstatic.com/android/keyboard/emojikitchen/${v}/${c(e1)}/${c(e1)}_${c(e2)}.png`;
    const versions = ["20201001", "20220823", "20230301", "20230803"];
    for (const v of versions) {
      for (const [e1, e2] of [
          [emojis[0], emojis[1]],
          [emojis[1], emojis[0]]
        ]) {
        const url = api(e1, e2, v);
        try {
          const response = await axios.get(url, {
            headers: {
              "User-Agent": "Postify/1.0.0"
            },
            responseType: "arraybuffer"
          });
          if (response.status === 200) {
            const buffer = Buffer.from(response.data);
            return {
              buffer: buffer,
              image: `data:image/png;base64,${buffer.toString("base64")}`,
              url: url
            };
          }
        } catch (error) {
          if (error.response && error.response.status !== 404) {
            console.error(error.message);
          }
          continue;
        }
      }
    }
    return {
      error: "Kombinasi emoji nya kagak ada bree, ganti kombinasi mix emoji nya yak 🤣"
    };
  }
}
export default async function handler(req, res) {
  const {
    emoji
  } = req.method === "GET" ? req.query : req.body;
  const emojimix = new Emojimix();
  if (!emoji) {
    return res.status(400).json({
      success: false,
      message: "Emoji tidak ditemukan."
    });
  }
  try {
    const result = await emojimix.create(emoji);
    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    res.setHeader("Content-Type", "image/png");
    return res.send(result.buffer);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}