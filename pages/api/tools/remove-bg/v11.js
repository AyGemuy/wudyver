import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class BgRemover {
  constructor() {
    this.url = "https://prodapi.phot.ai/app/api/v5/user_activity/background-remover";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://www.phot.ai",
      priority: "u=1, i",
      referer: "https://www.phot.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async removeBg({
    imageUrl
  }) {
    try {
      const res = await axios.post(this.url, {
        input_image_link: imageUrl
      }, {
        headers: this.headers
      });
      return res.data;
    } catch (err) {
      console.error("Gagal hapus BG:", err);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' is required"
    });
  }
  try {
    const remover = new BgRemover();
    const result = await remover.removeBg(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}