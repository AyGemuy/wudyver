import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import qs from "qs";
class Page2Images {
  constructor() {
    this.endpoint = "https://www.page2images.com/api/call";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: "https://www.page2images.com",
        Referer: "https://www.page2images.com/",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    }));
  }
  async generate({
    url,
    output = "buffer",
    ...rest
  } = {}) {
    if (!url) return {
      success: false,
      error: "URL is required"
    };
    try {
      const payload = qs.stringify({
        url: url,
        device: 6,
        flag: "main",
        ...rest
      });
      let attempts = 0;
      const maxAttempts = 60;
      const staticWait = 3e3;
      while (attempts < maxAttempts) {
        const response = await this.client.post(this.endpoint, payload);
        const data = response.data;
        if (data.status === "finished") {
          if (output === "direct_url") return {
            success: true,
            data: data.image_url
          };
          const imgRes = await axios.get(data.image_url, {
            responseType: "arraybuffer"
          });
          const buffer = Buffer.from(imgRes.data);
          const mime = imgRes.headers["content-type"] || "image/png";
          const finalData = output === "base64" && buffer.toString("base64") || output === "url" && `data:${mime};base64,${buffer.toString("base64")}` || buffer;
          return {
            success: true,
            data: finalData,
            mime: mime,
            attempts: attempts + 1,
            info: {
              left_calls: data.left_calls,
              cdn: data.image_url
            }
          };
        } else if (data.status === "processing") {
          attempts++;
          console.log(`[Page2Images] Attempt ${attempts}/${maxAttempts}: Still processing...`);
          await new Promise(resolve => setTimeout(resolve, staticWait));
        } else {
          throw new Error(data.msg || "Server error");
        }
      }
      throw new Error(`Timeout after ${maxAttempts} attempts.`);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
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
  const api = new Page2Images();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.mime);
    return res.status(200).send(result.data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}