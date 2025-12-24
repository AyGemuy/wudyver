import axios from "axios";
import crypto from "crypto";
import * as cheerio from "cheerio";
import {
  FormData,
  Blob
} from "formdata-node";
import SpoofHead from "@/lib/spoof-head";
class ClailaChat {
  constructor() {
    this.csrfToken = "";
    this.sessionId = "";
    this.baseUrl = "https://app.claila.com";
    this.availableModels = {
      chatgpt41mini: "ChatGPT 4.1 mini",
      chatgpt: "ChatGPT 4.1",
      chatgpto1p: "ChatGPT o1",
      claude: "Claude 4 Sonnet",
      gemini: "Gemini 2.0",
      mistral: "Mistral Large 2",
      grok: "Grok 3"
    };
    this.overchatApiUrl = "https://widget-api.overchat.ai";
  }
  randomCryptoIP() {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => b % 256).join(".");
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    const ip = this.randomCryptoIP();
    return {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/chat?uid=${this.randomID(8)}&lang=en`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
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
  }
  async getCsrfToken() {
    try {
      const headers = this.buildHeaders();
      const response = await axios.get(`${this.baseUrl}/api/v2/getcsrftoken`, {
        headers: headers,
        withCredentials: true
      });
      this.csrfToken = response.data;
      return this.csrfToken;
    } catch (error) {
      throw new Error(`Gagal mendapatkan token CSRF: ${error.message}`);
    }
  }
  parseImage(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const baseUrl = this.baseUrl || "";
    const createFullUrl = path => {
      if (!path || path.startsWith("http") || path.startsWith("//") || path.startsWith("javascript:")) {
        return path;
      }
      return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
    };
    const all_links = $("a[href]").map((i, el) => $(el).attr("href")).get().filter(href => href && href !== "#" && !href.startsWith("javascript:")).map(createFullUrl);
    const all_image_sources = $("img[src]").map((i, el) => createFullUrl($(el).attr("src"))).get();
    const mainImage = $(".img-wrapper img").first();
    return {
      image_url: createFullUrl(mainImage.attr("src")),
      image_id: mainImage.data("image-id") || null,
      image_size: $(".img-wrapper-size").first().text().trim() || null,
      download_link: createFullUrl($('.img-wrapper-tools a[title="Download"]').first().attr("href")),
      image_editor_link: createFullUrl($('.dropdown-menu a:contains("Image Editor")').first().attr("href")),
      all_links: [...new Set(all_links)],
      all_image_sources: [...new Set(all_image_sources.filter(Boolean))]
    };
  }
  async getImageData(url) {
    try {
      console.log("Mengambil data gambar...");
      const res = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const contentType = res.headers["content-type"] || "image/jpeg";
      const filename = url.split("/").pop() || "image.jpg";
      return {
        buffer: res.data,
        contentType: contentType,
        filename: filename
      };
    } catch (e) {
      console.error("Gagal mengambil gambar:", e.message);
      throw e;
    }
  }
  async txt2img({
    prompt,
    ...restPayload
  }) {
    if (!this.csrfToken) {
      await this.getCsrfToken();
    }
    if (!this.sessionId) {
      this.sessionId = Date.now().toString();
    }
    try {
      const response = await this.chat({
        prompt: prompt,
        type: "image",
        ...restPayload
      });
      return response.result;
    } catch (error) {
      throw new Error(`Gagal membuat gambar dari teks: ${error.message}`);
    }
  }
  async img2img({
    imageUrl,
    prompt,
    ...restPayload
  }) {
    try {
      if (!imageUrl) {
        throw new Error("URL gambar diperlukan untuk img2img.");
      }
      const {
        buffer,
        contentType: mimetype,
        filename: originalFilename
      } = await this.getImageData(imageUrl);
      const ext = originalFilename.split(".").pop() || "jpg";
      const filename = `Fiony_${crypto.randomBytes(4).toString("hex")}.${ext}`;
      const uuid = this.randomID(16);
      const imageBlob = new Blob([buffer], {
        type: mimetype
      });
      const form = new FormData();
      form.append("file", imageBlob, filename);
      const headers = this.buildHeaders({
        ...form.headers,
        authorization: "Bearer",
        "x-device-language": "en",
        "x-device-platform": "web",
        "x-device-uuid": uuid,
        "x-device-version": "1.0.44"
      });
      console.log("⏳ Memproses gambar menjadi gaya Ghibli...");
      const uploadRes = await axios.post(`${this.overchatApiUrl}/v1/chat/upload`, form, {
        headers: headers
      });
      const {
        link,
        croppedImageLink,
        chatId
      } = uploadRes.data;
      const imageGenPrompt = prompt || "Gaya Studio Ghibli, ilustrasi bergaya anime digambar tangan yang menawan.";
      const payload = {
        chatId: chatId,
        prompt: imageGenPrompt,
        model: "gpt-image-1",
        personaId: "image-to-image",
        metadata: {
          files: [{
            path: filename,
            link: link,
            croppedImageLink: croppedImageLink
          }]
        },
        ...restPayload
      };
      const jsonHeaders = this.buildHeaders({
        "content-type": "application/json",
        authorization: "Bearer",
        "x-device-language": "en",
        "x-device-platform": "web",
        "x-device-uuid": uuid,
        "x-device-version": "1.0.44"
      });
      const genRes = await axios.post(`${this.overchatApiUrl}/v1/images/generations`, payload, {
        headers: jsonHeaders
      });
      return genRes.data;
    } catch (error) {
      console.error("Gagal melakukan img2img:", error.message);
      throw new Error(`Gagal membuat gambar-ke-gambar: ${error.message}`);
    }
  }
  async chat({
    prompt = "",
    model = "chatgpt",
    type: calltype = "completion",
    ...rest
  }) {
    if (!this.csrfToken) {
      await this.getCsrfToken();
    }
    if (!this.sessionId) {
      this.sessionId = Date.now().toString();
    }
    if (!this.availableModels[model]) {
      return {
        error: `Model '${model}' tidak valid.`,
        availableModels: Object.keys(this.availableModels)
      };
    }
    const dataToSend = {
      calltype: calltype,
      message: prompt,
      sessionId: this.sessionId,
      ...rest
    };
    const payload = Object.keys(dataToSend).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(dataToSend[key])}`).join("&");
    try {
      const headers = this.buildHeaders({
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-CSRF-Token": this.csrfToken,
        "X-Requested-With": "XMLHttpRequest"
      });
      const response = await axios.post(`${this.baseUrl}/api/v2/unichat1/${model}`, payload, {
        headers: headers,
        withCredentials: true
      });
      if (calltype === "image") {
        const parsedImage = this.parseImage(response.data);
        return {
          result: parsedImage
        };
      } else {
        return {
          result: response.data
        };
      }
    } catch (error) {
      throw new Error(`Permintaan chat gagal: ${error.message}`);
    }
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
        action: "txt2img | img2img"
      }
    });
  }
  const lab = new ClailaChat();
  try {
    let result;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await lab.txt2img(params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl (required for ${action})`
          });
        }
        result = await lab.img2img(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: txt2img | img2img`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}