import axios from "axios";
class TTSTokohGenerator {
  constructor() {
    this._tokoh = {
      jokowi: {
        speed: -30,
        model: "id-ID-ArdiNeural-Male",
        tune: -3
      },
      megawati: {
        speed: -20,
        model: "id-ID-GadisNeural-Female",
        tune: -3
      },
      prabowo: {
        speed: -30,
        model: "id-ID-ArdiNeural-Male",
        tune: -3
      }
    };
    this.baseUrl = "https://deddy-tts-rvc-tokoh-indonesia.hf.space";
  }
  async synthesize(text, tokoh = "jokowi") {
    if (!text) throw new Error("Text is required");
    if (!Object.keys(this._tokoh).includes(tokoh)) throw new Error(`Available tokoh: ${Object.keys(this._tokoh).join(", ")}`);
    const session_hash = Math.random().toString(36).substring(2);
    await axios.post(`${this.baseUrl}/queue/join?`, {
      data: [tokoh, this._tokoh[tokoh].speed, text, this._tokoh[tokoh].model, this._tokoh[tokoh].tune, "rmvpe", .5, .33],
      event_data: null,
      fn_index: 0,
      trigger_id: 20,
      session_hash: session_hash
    });
    const {
      data
    } = await axios.get(`${this.baseUrl}/queue/data?session_hash=${session_hash}`);
    let result;
    const lines = data.split("\n\n");
    for (const line of lines) {
      if (line.startsWith("data:")) {
        const d = JSON.parse(line.substring(6));
        if (d.msg === "process_completed") result = d.output.data[2].url;
      }
    }
    return result;
  }
  async generate({
    text,
    tokoh = "jokowi",
    ...rest
  }) {
    if (!text) {
      throw new Error("Text is required for TTS generation.");
    }
    const audioUrl = await this.synthesize(text, tokoh);
    return {
      result: audioUrl
    };
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
    const generator = new TTSTokohGenerator();
    const response = await generator.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}