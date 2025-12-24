import axios from "axios";
import {
  FormData
} from "formdata-node";
import {
  randomBytes
} from "crypto";
import SpoofHead from "@/lib/spoof-head";
class ImageProcessor {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.headers = this.buildHeaders();
  }
  randomID(length = 8) {
    return randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-request-id": this.randomID(8),
      ...SpoofHead(),
      ...extra
    };
    return headers;
  }
  async getData(imageUrl) {
    try {
      const {
        data: buffer,
        headers
      } = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = headers["content-type"] || "image/jpeg";
      const ext = contentType.includes("jpeg") ? ".jpeg" : contentType.includes("png") ? ".png" : ".jpg";
      const filename = `upload${ext}`;
      return {
        buffer: buffer,
        contentType: contentType,
        filename: filename
      };
    } catch (err) {
      throw new Error("Failed to fetch image: " + err.message);
    }
  }
  async colorizer({
    imageUrl,
    type = "17",
    restore_face = "false",
    upscale = "false",
    positive_prompt = ", (masterpiece), sharp, high quality, 8k, epic, Photography,",
    negative_prompt = "black and white photo, grain, blur  CGI, Unreal, Airbrushed, Digital, sepia, ",
    scratches = "false",
    potrait = "false",
    color_mode = "1"
  }) {
    try {
      const {
        buffer,
        contentType,
        filename
      } = await this.getData(imageUrl);
      const form = new FormData();
      form.append("file", new Blob([buffer], {
        type: contentType
      }), filename);
      form.append("type", type);
      form.append("restore_face", restore_face);
      form.append("upscale", upscale);
      form.append("positive_prompts", Buffer.from(positive_prompt).toString("base64"));
      form.append("negative_prompts", Buffer.from(negative_prompt).toString("base64"));
      form.append("scratches", scratches);
      form.append("portrait", potrait);
      form.append("color_mode", color_mode);
      const response = await axios.post("https://photoai.imglarger.com/api/PhoAi/Upload", form, {
        headers: this.headers
      });
      return await this.pollUntilReady(response.data.data.code);
    } catch (err) {
      throw new Error("Failed to process colorizer: " + err.message);
    }
  }
  async caricature({
    imageUrl,
    type = "11",
    prompt = "Disney girl style",
    templateId = "21",
    sex = "female"
  }) {
    try {
      const {
        buffer,
        contentType,
        filename
      } = await this.getData(imageUrl);
      const form = new FormData();
      form.append("file", new Blob([buffer], {
        type: contentType
      }), filename);
      form.append("type", type);
      form.append("prompt", prompt);
      form.append("templateId", templateId);
      form.append("sex", sex);
      const response = await axios.post("https://photoai.imglarger.com/api/PhoAi/Upload", form, {
        headers: this.headers
      });
      return await this.pollUntilReady(response.data.data.code);
    } catch (err) {
      throw new Error("Failed to process caricature: " + err.message);
    }
  }
  async pollStatus(code) {
    try {
      const response = await axios.post("https://photoai.imglarger.com/api/PhoAi/CheckStatus", {
        code: code,
        type: 17
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (err) {
      throw new Error("Failed to poll status: " + err.message);
    }
  }
  async pollUntilReady(code) {
    let status;
    do {
      status = await this.pollStatus(code);
      if (status.data.status === "waiting") {
        await this.delay(3e3);
      }
    } while (status.data.status === "waiting");
    if (status.data.status === "success") {
      return status.data;
    } else {
      return null;
    }
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "colorizer | caricature"
      }
    });
  }
  const processor = new ImageProcessor("https://photoai.imglarger.com");
  try {
    let result;
    switch (action) {
      case "colorizer":
        result = await processor.colorizer(params);
        break;
      case "caricature":
        result = await processor.caricature(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: colorizer | caricature`
        });
    }
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}