import axios from "axios";
class LocoLoader {
  constructor(url) {
    this.url = url;
    this.baseUrl = "https://www.locoloader.com/api-extract/";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: `https://www.locoloader.com/?url=${encodeURIComponent(url)}`
    };
  }
  getExtractionKey(url) {
    let key = "";
    const ts = new Date().getTime().toString();
    for (let i = 0; i < url.length; i++) {
      if (url[i] === "t" || url[i] === ":" || url[i] === "/") {
        if (ts[i]) key += ts[i];
      } else if (i % 2) {
        key += url[i];
      } else {
        if (ts[i]) key += ts[i];
      }
    }
    return key;
  }
  async extractData() {
    try {
      const key = this.getExtractionKey(this.url);
      const formData = new URLSearchParams({
        url: this.url,
        pagination: "false",
        key: key
      }).toString();
      const {
        data
      } = await axios.post(this.baseUrl, formData, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      throw new Error(`Error mendapatkan data dari LocoLoader: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url: videoUrl
    } = req.method === "GET" ? req.query : req.body;
    if (!videoUrl) {
      return res.status(400).json({
        error: 'Paramenter "url" wajib diisi.'
      });
    }
    const locoLoader = new LocoLoader(videoUrl);
    const result = await locoLoader.extractData();
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}