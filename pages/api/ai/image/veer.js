import axios from "axios";
import crypto from "crypto";
import {
  FormData,
  Blob
} from "formdata-node";
class VheerImageGenerator {
  constructor() {
    this.baseUrl = "https://vheer.com";
    this.styleMapping = {
      1: "Flat Design",
      2: "Minimalist",
      3: "Cartoon",
      4: "Retro",
      5: "Outline",
      6: "Watercolor",
      7: "Isometric",
      8: "Nature"
    };
    this.axiosInstance = axios.create({
      headers: this.buildHeaders()
    });
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
    const commonHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": ip,
      "x-real-ip": ip,
      "x-request-id": this.randomID(8),
      ...extra
    };
    return commonHeaders;
  }
  _formatPrompt(basePrompt, styleName) {
    const elaborate = `Create a ${styleName} clip art illustration of ${basePrompt}, ${styleName.toLowerCase()} style, featuring undefined. The artwork should embody the essence of ${styleName}, capturing its unique visual appeal and aesthetic qualities. Designed with careful attention to detail, this illustration maintains a consistent and polished look, making it suitable for a wide range of creative applications.`;
    return Buffer.from(elaborate).toString("base64");
  }
  async _imageUrlToBlob(imageUrl) {
    try {
      const response = await this.axiosInstance.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = response.headers["content-type"] || "image/jpeg";
      return new Blob([response.data], {
        type: contentType
      });
    } catch (error) {
      throw new Error(`Gagal mengambil gambar dari ${imageUrl}: ${error.message}`);
    }
  }
  async _uploadForTxt2Img(prompt, style, width, height, model) {
    const form = new FormData();
    const apiStyleSpecificPrompt = this._formatPrompt(prompt, this.styleMapping[style]);
    form.append("prompt", apiStyleSpecificPrompt);
    form.append("type", style.toString());
    form.append("width", width.toString());
    form.append("height", height.toString());
    form.append("flux_model", model === 1 ? "1" : "0");
    try {
      const response = await axios.post("https://access.vheer.com/api/Vheer/UploadByFile", form, {
        headers: {
          ...form.headers,
          ...this.buildHeaders({
            Accept: "application/json, text/plain, */*"
          })
        },
        timeout: 3e4
      });
      if (response.data && response.data.code === 200 && response.data.data && response.data.data.code) {
        return response.data.data.code;
      } else {
        throw new Error("Respons upload tidak valid");
      }
    } catch (error) {
      throw error;
    }
  }
  async _uploadForImg2Img(imageBlob, filename, options) {
    const formData = new FormData();
    formData.append("file", imageBlob, filename);
    const encodedPositivePrompt = Buffer.from(options.prompt).toString("base64");
    const encodedNegativePrompt = Buffer.from(options.negative_prompt).toString("base64");
    formData.append("positive_prompts", encodedPositivePrompt);
    formData.append("negative_prompts", encodedNegativePrompt);
    formData.append("strength", options.strength.toString());
    formData.append("control_strength", options.control_strength.toString());
    formData.append("type", options.type.toString());
    formData.append("width", options.width.toString());
    formData.append("height", options.height.toString());
    formData.append("lora", options.lora);
    formData.append("batch_size", options.batch_size.toString());
    for (const key in options.rest) {
      if (Object.hasOwnProperty.call(options.rest, key)) {
        formData.append(key, options.rest[key].toString());
      }
    }
    try {
      const response = await this.axiosInstance.post("https://access.vheer.com/api/Vheer/UploadByFile", formData, {
        headers: this.buildHeaders({
          accept: "application/json, text/plain, */*",
          origin: "https://vheer.com",
          referer: "https://vheer.com/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        })
      });
      if (response.data.code !== 200 || !response.data.data || !response.data.data.code) {
        throw new Error(`Gagal mendapatkan kode gambar: ${response.data.msg || "Terjadi kesalahan"}`);
      }
      return response.data.data.code;
    } catch (error) {
      throw error;
    }
  }
  async _pollTaskStatus(taskCode, endpoint = "text-to-image", type = 1, interval = 3e3, maxAttempts = 20) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, interval));
      attempts++;
      try {
        const payload = [{
          type: type,
          code: taskCode
        }];
        const response = await this.axiosInstance.post(`https://vheer.com/app/${endpoint}`, JSON.stringify(payload), {
          headers: this.buildHeaders({
            accept: "text/x-component",
            "cache-control": "no-cache",
            "content-type": "text/plain;charset=UTF-8",
            "next-action": "1eeefc61e5469e1a173b48743a3cb8dd77eed91b",
            "next-router-state-tree": endpoint === "text-to-image" ? "%5B%22%22%2C%7B%22children%22%3A%5B%22app%22%2C%7B%22children%22%3A%5B%22(image-generator-flux)%22%2C%7B%22children%22%3A%5B%22text-to-image%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fapp%2Ftext-to-image%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D" : "%5B%22%22%2C%7B%22children%22%3A%5B%22app%22%2C%7B%22children%22%3A%5B%22(image-tools)%22%2C%7B%22children%22%3A%5B%22image-to-image%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fapp%2Fimage-to-image%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
            pragma: "no-cache",
            priority: "u=1, i",
            referer: `https://vheer.com/app/${endpoint}`,
            "sec-fetch-site": "same-origin"
          })
        });
        const responseText = response.data;
        const jsonStartIndex = responseText.indexOf("{");
        if (jsonStartIndex !== -1) {
          try {
            const jsonString = responseText.substring(jsonStartIndex);
            const jsonData = JSON.parse(jsonString);
            if (jsonData.code === 200 && jsonData.data && jsonData.data.status === "success") {
              return {
                status: "success",
                downloadUrls: jsonData.data.downloadUrls,
                url: jsonData.data.downloadUrls[0],
                ...jsonData.data
              };
            }
          } catch (jsonError) {
            continue;
          }
        }
      } catch (error) {
        continue;
      }
    }
    throw new Error(`Polling timeout setelah ${maxAttempts} percobaan untuk ${endpoint}`);
  }
  async txt2img({
    prompt = "naga merah meniup api di atas gunung",
    style = 1,
    width = 512,
    height = 512,
    model = 1
  }) {
    const styleName = this.styleMapping[style];
    if (!styleName) {
      throw new Error(`Style tidak valid: ${style}. Pilihan: ${Object.keys(this.styleMapping).join(", ")}`);
    }
    try {
      const taskCode = await this._uploadForTxt2Img(prompt, style, width, height, model);
      const result = await this._pollTaskStatus(taskCode, "text-to-image", 1);
      return result;
    } catch (error) {
      throw error;
    }
  }
  async img2img({
    imageUrl,
    prompt = "naga merah meniup api di atas gunung",
    negative_prompt = "",
    strength = .975,
    control_strength = .2,
    type = 4,
    width = 1024,
    height = 1024,
    lora = "",
    batch_size = 1,
    ...rest
  }) {
    try {
      const imageBlob = await this._imageUrlToBlob(imageUrl);
      const filename = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
      const taskCode = await this._uploadForImg2Img(imageBlob, filename, {
        prompt: prompt,
        negative_prompt: negative_prompt,
        strength: strength,
        control_strength: control_strength,
        type: type,
        width: width,
        height: height,
        lora: lora,
        batch_size: batch_size,
        rest: rest
      });
      const generatePayload = [{
        type: type,
        code: taskCode
      }];
      await this.axiosInstance.post("https://vheer.com/app/image-to-image", JSON.stringify(generatePayload), {
        headers: this.buildHeaders({
          accept: "text/x-component",
          "cache-control": "no-cache",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "1eeefc61e5469e1a173b48743a3cb8dd77eed91b",
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22app%22%2C%7B%22children%22%3A%5B%22(image-tools)%22%2C%7B%22children%22%3A%5B%22image-to-image%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fapp%2Fimage-to-image%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://vheer.com/app/image-to-image",
          "sec-fetch-site": "same-origin"
        })
      });
      const result = await this._pollTaskStatus(taskCode, "image-to-image", 4);
      return result;
    } catch (error) {
      throw error;
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
  const generator = new VheerImageGenerator();
  try {
    let result;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await generator.txt2img(params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl (required for ${action})`
          });
        }
        result = await generator.img2img(params);
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