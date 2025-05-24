import fetch from "node-fetch";
async function TTSG(text, lang = "id") {
  try {
    const url = `https://translate.google.com/translate_tts?tl=${lang}&q=${encodeURIComponent(text)}&client=tw-ob`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch TTS audio: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    text,
    lang = "id"
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      success: false,
      message: "Text parameter is required"
    });
  }
  try {
    const audioBuffer = await TTSG(text, lang);
    res.set("Content-Type", "audio/mp3");
    return res.status(200).send(audioBuffer);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}