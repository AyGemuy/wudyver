import axios from "axios";
class CustomJS {
  constructor() {
    this.endpoint = "https://jugizr8omb.execute-api.eu-central-1.amazonaws.com/stage/public-test/screenshot";
    this.commonHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://www.customjs.space",
      pragma: "no-cache",
      referer: "https://www.customjs.space/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async generate({
    url = "https://x.com",
    output = "buffer",
    commands = [],
    ...rest
  } = {}) {
    try {
      const inputPayload = JSON.stringify({
        url: url,
        commands: commands,
        ...rest
      });
      const response = await axios.post(this.endpoint, {
        input: inputPayload
      }, {
        headers: this.commonHeaders
      });
      const data = response.data;
      if (data.statusCode === 200 && data.output) {
        const base64String = data.output;
        const buffer = Buffer.from(base64String, "base64");
        const mime = "image/png";
        const finalResult = output === "base64" && base64String || output === "url" && `data:${mime};base64,${base64String}` || buffer;
        return {
          success: true,
          data: finalResult,
          mime: mime,
          size: buffer.length,
          log: data.log
        };
      } else {
        throw new Error(data.log || "Gagal mengambil screenshot dari CustomJS");
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new CustomJS();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.mime);
    return res.status(200).send(result.data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}