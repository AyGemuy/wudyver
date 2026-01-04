import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
const STYLES = ["Ghibli", "3D_Chibi", "Chinese_Ink", "LEGO", "Jojo", "Pixel", "Picasso", "Van_Gogh", "Oil_Painting", "Rick_Morty", "Line", "Macaron", "Fabric", "Irasutoya", "Snoopy", "Poly", "American_Cartoon", "Origami", "Pop_Art", "Paper_Cutting", "Vector", "Clay_Toy"];
class ImageUpscalingReImagine {
  constructor() {
    this.jar = new CookieJar();
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://image-upscaling.net/reImagine",
      origin: "https://image-upscaling.net",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.client = wrapper(axios.create({
      baseURL: "https://image-upscaling.net",
      jar: this.jar,
      withCredentials: true,
      headers: this.headers
    }));
  }
  async resolveBuffer(source) {
    try {
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string") {
        if (source.startsWith("http")) {
          const res = await axios.get(source, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        const base64Data = source.includes("base64,") ? source.split("base64,")[1] : source;
        return Buffer.from(base64Data, "base64");
      }
      throw new Error("Invalid image source");
    } catch (e) {
      throw new Error(`Failed to resolve image: ${e.message}`);
    }
  }
  async initPage() {
    try {
      await this.client.get("/reImagine", {
        headers: {
          ...this.headers,
          "Upgrade-Insecure-Requests": "1",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate"
        }
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  async uploadImage(buffer, style) {
    try {
      console.log(`[ReImagine] Uploading image with style: ${style}...`);
      const form = new FormData();
      const filename = `upload_${Date.now()}.jpg`;
      form.append("image", buffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      form.append("style", style);
      const headers = {
        ...this.headers,
        ...form.getHeaders(),
        origin: "https://image-upscaling.net"
      };
      const {
        data
      } = await this.client.post("/reImagine_upload", form, {
        headers: headers
      });
      if (!data) throw new Error("Upload failed, no response data");
      return data;
    } catch (e) {
      throw new Error(`Upload Failed: ${e.message}`);
    }
  }
  async getStatus() {
    try {
      const {
        data
      } = await this.client.get("/reImagine_get_status");
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }
  async resolveMedia(url, outputType) {
    try {
      if (outputType === "url") {
        const res = await this.client.head(url);
        return {
          result: url,
          contentType: res.headers["content-type"] || "image/png",
          size: res.headers["content-length"]
        };
      }
      const res = await this.client.get(url, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(res.data);
      const contentType = res.headers["content-type"] || "image/png";
      if (outputType === "base64") {
        return {
          result: `data:${contentType};base64,${buffer.toString("base64")}`,
          contentType: contentType,
          size: buffer.length
        };
      }
      if (outputType === "buffer") {
        return {
          result: buffer,
          contentType: contentType,
          size: buffer.length
        };
      }
    } catch (e) {
      throw new Error(`Media resolution failed: ${e.message}`);
    }
  }
  async generate({
    imageUrl,
    style = "Ghibli",
    output: outputType = "buffer"
  }) {
    try {
      if (!STYLES.includes(style)) {
        throw new Error(JSON.stringify({
          message: `Style '${style}' tidak valid.`,
          allowed_styles: STYLES
        }));
      }
      await this.initPage();
      const buffer = await this.resolveBuffer(imageUrl);
      const reqId = await this.uploadImage(buffer, style);
      console.log(`[ReImagine] Request ID: ${reqId}`);
      let resultUrl = null;
      let attempts = 0;
      const maxAttempts = 60;
      while (!resultUrl && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 3e3));
        const history = await this.getStatus();
        const item = history.find(h => h.req_id === reqId);
        if (item) {
          if (item.is_completed && item.result) {
            resultUrl = item.result;
            console.log(`[ReImagine] Completed: ${resultUrl}`);
          } else {
            console.log(`[ReImagine] Processing...`);
          }
        } else {
          console.log(`[ReImagine] Waiting for entry...`);
        }
        attempts++;
      }
      if (!resultUrl) throw new Error("Timeout: Processing took too long.");
      const data = await this.resolveMedia(resultUrl, outputType);
      return {
        status: "success",
        style: style,
        ...data
      };
    } catch (error) {
      console.error("[ReImagine Error]", error.message);
      return {
        status: "failed",
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new ImageUpscalingReImagine();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.result);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}