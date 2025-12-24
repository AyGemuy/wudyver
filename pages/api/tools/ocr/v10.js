import axios from "axios";
import FormData from "form-data";

function genSerial(length) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
class DecopyOCRService {
  constructor() {
    this.cookies = "";
    this.axiosInstance = axios.create({
      baseURL: "https://api.decopy.ai/api/decopy/",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "product-code": "067003",
        "product-serial": genSerial(32),
        origin: "https://decopy.ai",
        referer: "https://decopy.ai/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      },
      "Content-Type": undefined
    });
  }
  async getCookies() {
    try {
      const response = await axios.get("https://decopy.ai/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "Accept-Language": "id-ID,id;q=0.9"
        }
      });
      const setCookieHeaders = response.headers["set-cookie"];
      if (setCookieHeaders) {
        this.cookies = setCookieHeaders.map(cookieString => cookieString.split(";")[0]).join("; ");
      }
      return this.cookies;
    } catch (error) {
      console.error("Error fetching initial cookies:", error.message);
      throw error;
    }
  }
  async processImage(input, options = {}) {
    if (!input) throw new Error("Image input is required");
    !this.cookies && await this.getCookies();
    try {
      const isBuffer = Buffer.isBuffer(input);
      const isBase64 = typeof input === "string" && input.startsWith("data:");
      const isUrl = typeof input === "string" && (input.startsWith("http://") || input.startsWith("https://"));
      const imageData = isBuffer ? await this.processBuffer(input, options) : isBase64 ? await this.processBase64(input) : isUrl ? await this.processUrl(input) : (() => {
        throw new Error("Unsupported input type");
      })();
      const formData = new FormData();
      formData.append("upload_images", imageData.buffer, {
        filename: imageData.filename,
        contentType: imageData.contentType
      });
      const requestHeaders = {
        ...formData.getHeaders(),
        ...this.cookies && {
          Cookie: this.cookies
        }
      };
      const response = await this.axiosInstance.post("image-to-text/create-job", formData, {
        headers: requestHeaders
      });
      return response.data?.result;
    } catch (error) {
      console.error("Error during OCR process:", error.message);
      error.response && console.error("API Response:", error.response.data);
      throw error;
    }
  }
  async processUrl(url) {
    const imageResponse = await axios.get(url, {
      responseType: "arraybuffer"
    });
    return {
      buffer: Buffer.from(imageResponse.data),
      contentType: imageResponse.headers["content-type"] || "image/jpeg",
      filename: url.substring(url.lastIndexOf("/") + 1) || "image.jpg"
    };
  }
  async processBase64(base64String) {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const contentType = base64String.startsWith("data:image/png") ? "image/png" : base64String.startsWith("data:image/gif") ? "image/gif" : base64String.startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
    const extension = contentType.split("/")[1];
    return {
      buffer: buffer,
      contentType: contentType,
      filename: `image.${extension}`
    };
  }
  async processBuffer(buffer, options = {}) {
    return {
      buffer: buffer,
      contentType: options.contentType || "image/jpeg",
      filename: options.filename || "image.jpg"
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  !params.image && res.status(400).json({
    error: "Image is required"
  });
  try {
    const ocrService = new DecopyOCRService();
    const data = await ocrService.processImage(params.image, {
      contentType: params.contentType,
      filename: params.filename
    });
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}