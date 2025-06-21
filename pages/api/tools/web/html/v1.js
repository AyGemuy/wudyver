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
  async getHtml(url) {
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
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).send("URL is required");
  }
  try {
    const getHtmlInstance = new GetHtml();
    const html = await getHtmlInstance.getHtml(url);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(html);
  } catch (error) {
    res.status(500).send(error.message);
  }
}