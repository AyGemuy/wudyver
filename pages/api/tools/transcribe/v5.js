import axios from "axios";
class WhisperClient {
  async generate({
    model,
    input,
    ...rest
  }) {
    console.log("start");
    try {
      let b64 = "";
      if (typeof input === "string" && input.startsWith("http")) {
        console.log("url");
        const {
          data
        } = await axios.get(input, {
          responseType: "arraybuffer"
        });
        b64 = Buffer.from(data).toString("base64");
      } else if (Buffer.isBuffer(input)) {
        console.log("buf");
        b64 = input.toString("base64");
      } else if (typeof input === "string") {
        console.log("b64");
        b64 = input;
      } else {
        throw new Error("invalid input");
      }
      const m = model ?? "@cf/openai/whisper";
      console.log("post", m);
      const {
        data: res
      } = await axios.post("https://srv-koyeb.koyeb.app/api/cf/v2/audio2text", {
        audio: b64,
        model: m,
        ...rest
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log("ok", res);
      return res;
    } catch (e) {
      console.error("err", e.message);
      return {
        status: false,
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.input) {
    return res.status(400).json({
      error: "Parameter 'input' diperlukan"
    });
  }
  const api = new WhisperClient();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}