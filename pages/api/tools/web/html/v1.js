import axios from "axios";
class GetHtml {
  constructor() {
    this.headers = {
      "X-Return-Format": "html",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://shir-man.com/strip-html/",
      "Content-Type": "plain/text",
      Accept: "plain/text"
    };
  }
  async download({
    url
  }) {
    try {
      const {
        data
      } = await axios.get(`https://r.jina.ai/${url}`, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      throw new Error("Failed to fetch HTML");
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
  const api = new GetHtml();
  try {
    const result = await api.download(params);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}