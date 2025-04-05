import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class DynasparkAPI {
  constructor() {
    this.baseURL = "https://dynaspark.onrender.com/generate_response";
    this.cookieURL = "https://dynaspark.onrender.com";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "multipart/form-data",
      origin: "https://dynaspark.onrender.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://dynaspark.onrender.com/",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
    this.cookies = "";
  }
  async updateCookies() {
    try {
      const {
        headers
      } = await axios.get(this.cookieURL, {
        headers: this.headers
      });
      this.cookies = headers["set-cookie"]?.map(cookie => cookie.split(";")[0]).join("; ") || "";
      this.headers["cookie"] = this.cookies;
    } catch (error) {
      console.error("Gagal memperbarui cookie:", error);
    }
  }
  async chat({
    prompt,
    model = "gemini-1.5-flash",
    imgUrl = null
  }) {
    try {
      await this.updateCookies();
      const form = new FormData();
      form.append("user_input", prompt);
      form.append("ai_model", model);
      if (imgUrl && /^https?:\/\//.test(imgUrl)) {
        const {
          data: fileBuffer,
          headers
        } = await axios.get(imgUrl, {
          responseType: "arraybuffer"
        });
        const ext = headers["content-type"].split("/")[1];
        form.append("file", new Blob([fileBuffer], {
          type: headers["content-type"]
        }), `image.${ext}`);
      }
      const {
        data
      } = await axios.post(this.baseURL, form, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      console.error("Error dalam permintaan chat:", error);
      return {
        error: "Terjadi kesalahan saat menghubungi API."
      };
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
  const gemini = new DynasparkAPI();
  try {
    const data = await gemini.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}