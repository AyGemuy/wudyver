import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  FormData
} from "formdata-node";
class HeyiUpscaler {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.endpoint = "https://backend.heyi.app/images/upscale";
  }
  async upscale(imageUrl) {
    try {
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBlob = new Blob([imageResponse.data], {
        type: "image/jpeg"
      });
      const form = new FormData();
      form.append("design", imageBlob, "image.jpg");
      form.append("userId", "");
      const headers = {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9",
        Connection: "keep-alive",
        Origin: "https://www.heyi.app",
        Referer: "https://www.heyi.app/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      };
      const response = await this.client.post(this.endpoint, form, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      throw new Error("Gagal mengunggah gambar");
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing url in request"
    });
  }
  const upscaler = new HeyiUpscaler();
  try {
    const result = await upscaler.upscale(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}