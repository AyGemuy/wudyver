import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class GhibliStyleImageNet {
  constructor() {
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://ghiblistyleimage.net",
      referer: "https://ghiblistyleimage.net/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.txt2imgUrl = "https://ghiblistyleimage.net/api/text-to-image";
  }
  async generate({
    prompt
  }) {
    try {
      console.log(`[txt2img] Prompt: ${prompt}`);
      const res = await axios.post(this.txt2imgUrl, {
        prompt: prompt
      }, {
        headers: this.headers
      });
      return res?.data;
    } catch (err) {
      console.error("[txt2img] Error:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const generator = new GhibliStyleImageNet();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}