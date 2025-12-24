import axios from "axios";
class ZapcapMetadata {
  constructor(cookie = "") {
    this.cookie = cookie;
    this.baseUrl = "https://app.zapcap.ai/api/tools/external-download/get-metadata";
  }
  async metadata({
    url
  }) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          url: url
        },
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          pragma: "no-cache",
          referer: "https://app.zapcap.ai/tools/download/youtube-mp3",
          origin: "https://app.zapcap.ai",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          cookie: this.cookie
        }
      });
      console.log("[Zapcap] ✅", response.data);
      return response.data;
    } catch (err) {
      console.error("[Zapcap] ❌", err.message || err);
      return {
        status: 500,
        error: err.message || err
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) {
      return res.status(400).json({
        error: "No URL"
      });
    }
    const yt = new ZapcapMetadata();
    const result = await yt.metadata(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}