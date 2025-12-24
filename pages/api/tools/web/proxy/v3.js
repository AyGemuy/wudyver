import axios from "axios";
class Plexity {
  constructor() {
    this.baseUrl = "https://localplexity-proxy-cors-buster.legraphista.workers.dev/";
  }
  async sendRequest(payload = {
    url: "",
    method: "GET",
    body: null
  }) {
    try {
      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Referer: "https://localplexity.pages.dev/"
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: 'Paramenter "url" wajib disertakan.'
    });
  }
  const proxyium = new Plexity();
  try {
    const result = await proxyium.sendRequest(params);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).json({
      message: "Error occurred",
      error: error.message
    });
  }
}