import axios from "axios";
export default async function handler(req, res) {
  const {
    action,
    type = "sfw"
  } = req.method === "GET" ? req.query : req.body;
  const sfwActions = ["waifu", "neko", "shinobu", "megumin", "bully", "cuddle", "cry", "hug", "awoo", "kiss", "lick", "pat", "smug", "bonk", "yeet", "blush", "smile", "wave", "highfive", "handhold", "nom", "bite", "glomp", "slap", "kill", "kick", "happy", "wink", "poke", "dance", "cringe"];
  const nsfwActions = ["waifu", "neko", "trap", "blowjob"];
  if (type === "sfw" && !sfwActions.includes(action)) {
    return res.status(400).json({
      error: "Invalid action for 'sfw' type."
    });
  }
  if (type === "nsfw" && !nsfwActions.includes(action)) {
    return res.status(400).json({
      error: "Invalid action for 'nsfw' type."
    });
  }
  if (!["sfw", "nsfw"].includes(type)) {
    return res.status(400).json({
      error: "Invalid type. Must be 'sfw' or 'nsfw'."
    });
  }
  try {
    const response = await axios.get(`https://api.waifu.pics/${type}/${action}`);
    if (!response.data?.url) {
      return res.status(500).json({
        error: "Failed to fetch image."
      });
    }
    const media = await axios.get(response.data.url, {
      responseType: "arraybuffer"
    });
    const contentType = media.headers["content-type"];
    res.setHeader("Content-Type", contentType);
    return res.status(200).send(media.data);
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error."
    });
  }
}