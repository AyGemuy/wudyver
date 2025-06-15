import axios from "axios";
class TextToSpeech {
  async generate({
    text
  }) {
    const url = "https://entiretools.com/play-tts";
    const data = new URLSearchParams();
    data.append("read", text);
    const config = {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
        Referer: "https://seomagnifier.com/text-to-speech-converter"
      }
    };
    try {
      const response = await axios.post(url, data, config);
      return {
        result: response.data
      };
    } catch (error) {
      console.error("Terjadi error saat menghasilkan audio:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "text are required"
    });
  }
  try {
    const ttsGenerator = new TextToSpeech();
    const response = await ttsGenerator.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}