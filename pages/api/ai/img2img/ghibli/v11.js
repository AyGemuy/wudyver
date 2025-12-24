import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import SpoofHead from "@/lib/spoof-head";
class Headshotly {
  constructor() {
    this.url = "https://api.headshotly.ai/api/engine/free-transform-ghibli";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://headshotly.ai",
      priority: "u=1, i",
      referer: "https://headshotly.ai/",
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
  async getData(imageUrl) {
    try {
      const res = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const mime = res.headers["content-type"];
      const ext = mime ? mime.split("/")[1] : "png";
      return {
        buffer: Buffer.from(res.data),
        mime: mime,
        ext: ext
      };
    } catch (e) {
      console.error("getData error:", e.message);
      throw e;
    }
  }
  async generate({
    imageUrl
  }) {
    try {
      const {
        buffer,
        mime,
        ext
      } = await this.getData(imageUrl);
      const blob = new Blob([buffer], {
        type: mime
      });
      const form = new FormData();
      form.append("file", blob, `file.${ext}`);
      const res = await axios.post(this.url, form, {
        headers: {
          ...this.headers,
          ...form.headers
        },
        data: form
      });
      console.log("Upload result:", res.data);
      return res.data;
    } catch (e) {
      console.error("uploadImage error:", e.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const generator = new Headshotly();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}