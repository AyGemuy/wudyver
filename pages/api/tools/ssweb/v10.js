import axios from "axios";
class ApiFlash {
  constructor() {
    this.endpoint = "https://api.apiflash.com/v1/urltoimage";
    this.accessKey = "147654dd185b46af9f04ca124f9a7df2";
    this.commonHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://ai.s2u.me",
      referer: "https://ai.s2u.me/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async generate({
    url = "https://x.com",
    output = "buffer",
    ...customParams
  } = {}) {
    try {
      const finalParams = {
        access_key: this.accessKey,
        url: url,
        width: 1280,
        height: 800,
        response_type: "image",
        delay: 2,
        format: "png",
        quality: 100,
        fresh: "true",
        ...customParams
      };
      const response = await axios.get(this.endpoint, {
        params: finalParams,
        headers: this.commonHeaders,
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      const mime = response.headers["content-type"] || "image/png";
      const finalResult = output === "base64" && buffer.toString("base64") || output === "url" && `data:${mime};base64,${buffer.toString("base64")}` || buffer;
      return {
        success: true,
        data: finalResult,
        mime: mime,
        paramsUsed: finalParams
      };
    } catch (error) {
      let msg = error.message;
      if (error.response?.data) {
        try {
          const errJson = JSON.parse(Buffer.from(error.response.data).toString());
          msg = errJson.message || msg;
        } catch (e) {
          msg = `Error ${error.response.status}`;
        }
      }
      return {
        success: false,
        error: msg
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
  const api = new ApiFlash();
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