import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  FormData,
  Blob
} from "formdata-node";
class ImageRemover {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = axios.create({
      baseURL: "https://removal.ai",
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        Pragma: "no-cache",
        Referer: "https://removal.ai/upload/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      },
      jar: this.cookieJar,
      withCredentials: true
    });
  }
  async getWebToken() {
    try {
      const response = await this.client.get("https://removal.ai/wp-admin/admin-ajax.php?action=ajax_get_webtoken&security=27d6ec61a2");
      const {
        success,
        data
      } = response.data;
      if (success) {
        return data.webtoken;
      } else {
        throw new Error("Failed to get web token");
      }
    } catch (error) {
      console.error("Error getting web token:", error);
      throw error;
    }
  }
  async removeImage(imgUrl) {
    try {
      const webToken = await this.getWebToken();
      const formData = new FormData();
      const imageBlob = await this.fetchImageBlob(imgUrl);
      formData.append("image_file", imageBlob, "image.webp");
      const response = await this.client.post("https://api.removal.ai/3.0/remove", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Web-Token": webToken,
          Origin: "https://removal.ai",
          Priority: "u=1, i"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error removing image:", error);
      throw error;
    }
  }
  async fetchImageBlob(imgUrl) {
    try {
      const response = await axios.get(imgUrl, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      return new Blob([buffer]);
    } catch (error) {
      console.error("Error fetching image:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Parameter 'url' is required"
    });
  }
  try {
    const remover = new ImageRemover();
    const result = await remover.removeImage(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}