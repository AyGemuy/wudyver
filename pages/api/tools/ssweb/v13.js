import axios from "axios";
class PikaStyle {
  constructor() {
    this.endpoint = "https://pika.style/api/getScreenshotFromURL";
    this.commonHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://pika.style",
      pragma: "no-cache",
      referer: "https://pika.style/tool/website-screenshot-generator",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      baggage: "sentry-environment=vercel-production,sentry-release=c80f4880af85e8c02b1e99fef1d8aa8851ea51cf,sentry-public_key=a22c3b26a2354bb8b521244862e804d4,sentry-trace_id=24907ab9771846e29ffe7f96c95275d7",
      "sentry-trace": "24907ab9771846e29ffe7f96c95275d7-a1770802de8d18b4"
    };
  }
  async generate({
    url,
    output = "buffer",
    ...rest
  } = {}) {
    if (!url) return {
      success: false,
      error: "URL is required"
    };
    try {
      const payload = {
        url: url,
        fullCapture: true,
        mobileCapture: false,
        width: 1280,
        height: 1080,
        ...rest
      };
      const response = await axios.post(this.endpoint, payload, {
        headers: this.commonHeaders
      });
      const data = response.data;
      if (data && data.base) {
        const dataUri = data.base;
        const base64Murni = dataUri.split(";base64,").pop();
        const buffer = Buffer.from(base64Murni, "base64");
        const finalResult = output === "url" && dataUri || output === "base64" && base64Murni || buffer;
        return {
          success: true,
          data: finalResult,
          mime: "image/png",
          size: buffer.length
        };
      } else {
        throw new Error("Invalid response from Pika API");
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
  const api = new PikaStyle();
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