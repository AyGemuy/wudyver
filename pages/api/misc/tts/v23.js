import axios from "axios";
class SpeechSynthesizer {
  constructor() {
    this.baseUrl = "http://49.128.218.60:7000/v1/audio/speech";
    this.headers = {
      "Content-Type": "application/json",
      Accept: "*/*",
      Origin: "http://49.128.218.60:7000",
      Referer: "http://49.128.218.60:7000/",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
      DNT: "1",
      "Accept-Encoding": "gzip, deflate",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
    };
  }
  async generate({
    text,
    voice = "alloy",
    ins = "",
    format = "mp3",
    ...rest
  }) {
    const payload = {
      input: text,
      voice: voice,
      instructions: ins,
      response_format: format,
      ...rest
    };
    try {
      const response = await axios.post(this.baseUrl, payload, {
        headers: this.headers,
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data ? new TextDecoder().decode(error.response.data) : error.message;
      throw new Error(`Permintaan API gagal: ${error.response?.status} - ${errorMessage}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Paramenter 'text' diperlukan."
    });
  }
  try {
    const ttsGenerator = new SpeechSynthesizer();
    const audioBuffer = await ttsGenerator.generate(params);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.setHeader("Content-Disposition", 'inline; filename="speech.mp3"');
    return res.status(200).send(audioBuffer);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}