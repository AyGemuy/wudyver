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
      throw new Error(`Failed to fetch image from ${imageUrl}: ${error.message}`);
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
        throw new Error("Invalid upload response");
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
        throw new Error(`Failed to get image code: ${response.data.msg || "An error occurred"}`);
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
            "next-router-state-tree": endpoint === "text-to-image" ? "%5B%22%22%2C%7B%22children%22%3A%5B%22app%22%2C%7B%22children%22%3A%5B%22(image-generator-flux)%22%2C%7B%22children%22%3A%5B%22text-to-image%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fapp%2Ftext-to-image%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D" : endpoint === "image-to-image" ? "%5B%22%22%2C%7B%22children%22%3A%5B%22app%22%2C%7B%22children%22%3A%5B%22(image-tools)%22%2C%7B%22children%22%3A%5B%22image-to-image%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fapp%2Fimage-to-image%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D" : endpoint === "pixar-disney-art-generator" ? "%5B%22%22%2C%7B%22children%22%3A%5B%22app%22%2C%7B%22children%22%3A%5B%22(image-generator-flux)%22%2C%7B%22children%22%3A%5B%22pixar-disney-art-generator%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fapp%2Fpixar-disney-art-generator%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D" : endpoint === "anime-portrait" ? "%5B%22%22%2C%7B%22children%22%3A%5B%22app%22%2C%7B%22children%22%3A%5B%22(portrait-generator-flux)%22%2C%7B%22children%22%3A%5B%22anime-portrait%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fapp%2Fanime-portrait%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D" : "%5B%22%22%2C%7B%22children%22%3A%5B%22app%22%2C%7B%22children%22%3A%5B%22(image-tools)%22%2C%7B%22children%22%3A%5B%22image-to-video%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fapp%2Fimage-to-video%22%2C%22refresh%22%5D%7D%5D%7D%2Cnull%2Cnull%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
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
    throw new Error(`Polling timed out after ${maxAttempts} attempts for ${endpoint}`);
  }
  async txt2img({
    prompt = "A red dragon breathing fire on a mountain",
    style = 1,
    width = 512,
    height = 512,
    model = 1
  }) {
    const styleName = this.styleMapping[style];
    if (!styleName) {
      throw new Error(`Invalid style: ${style}. Options: ${Object.keys(this.styleMapping).join(", ")}`);
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
    prompt = "A red dragon breathing fire on a mountain",
    negative_prompt = "low quality, bad quality, blurry",
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
  async img2prompt({
    imageUrl,
    promptStyle = "long"
  }) {
    try {
      const imageBlob = await this._imageUrlToBlob(imageUrl);
      const filename = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
      const formData = new FormData();
      formData.append("1_image", imageBlob, filename);
      formData.append("1_promptStyle", promptStyle);
      formData.append("0", `["$K1","wlz8hlb7z"]`);
      const headers = this.buildHeaders({
        accept: "text/x-component",
        "content-type": `multipart/form-data; boundary=${formData.getBoundary()}`,
        "next-action": "fa6112528e902fdca102489e06fea745880f88e3",
        "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22app%22%2C%7B%22children%22%3A%5B%22(image-tools)%22%2C%7B%22children%22%3A%5B%22image-to-prompt%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fapp%2Fimage-to-prompt%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
        referer: "https://vheer.com/app/image-to-prompt"
      });
      const response = await this.axiosInstance.post("https://vheer.com/app/image-to-prompt", formData, {
        headers: headers,
        timeout: 3e4
      });
      const responseText = response.data;
      try {
        const jsonData = JSON.parse(responseText.substring(responseText.indexOf("{")));
        if (jsonData.code === 200 && jsonData.data && jsonData.data.prompt) {
          return {
            status: "success",
            prompt: jsonData.data.prompt
          };
        } else if (jsonData.prompt) {
          return {
            status: "success",
            prompt: jsonData.prompt
          };
        }
      } catch (e) {
        const promptMatch = responseText.match(/prompt: "([^"]+)"/);
        if (promptMatch && promptMatch[1]) {
          return {
            status: "success",
            prompt: promptMatch[1]
          };
        } else {
          return {
            status: "unknown_response_format",
            rawData: responseText
          };
        }
      }
    } catch (error) {
      throw new Error(`Failed to convert image to prompt: ${error.message}`);
    }
  }
  async pixar({
    prompt = "A beautifully crafted character in the Semi-Realistic, showcasing a confident woman in a trench coat walking through city rain. Set in a a dark, rainy city street illuminated by streetlights, the scene is brought to life with realistic clothing textures, dramatic rain effects, and moody lighting, evoking the emotional depth and whimsical charm characteristic of Pixar and Disney animation.",
    width = 896,
    height = 1152,
    type = 1,
    model = 1
  }) {
    const encodedPrompt = Buffer.from(prompt).toString("base64");
    const form = new FormData();
    form.append("prompt", encodedPrompt);
    form.append("type", type.toString());
    form.append("width", width.toString());
    form.append("height", height.toString());
    form.append("flux_model", model.toString());
    try {
      const uploadResponse = await axios.post("https://access.vheer.com/api/Vheer/UploadByFile", form, {
        headers: {
          ...form.headers,
          ...this.buildHeaders({
            Accept: "application/json, text/plain, */*",
            Referer: "https://vheer.com/",
            "sec-fetch-site": "same-site"
          })
        },
        timeout: 3e4
      });
      if (uploadResponse.data.code !== 200 || !uploadResponse.data.data || !uploadResponse.data.data.code) {
        throw new Error(`Failed to get image code from upload: ${uploadResponse.data.msg || "An error occurred"}`);
      }
      const taskCode = uploadResponse.data.data.code;
      const result = await this._pollTaskStatus(taskCode, "pixar-disney-art-generator", type);
      return result;
    } catch (error) {
      throw error;
    }
  }
  async anime({
    imageUrl,
    prompt = "A stunning anime portrait in Cyberpunk, the gender is Female, set against A neon-lit futuristic city with towering skyscrapers and glowing billboards, featuring A confident smirk. The character wears High-tech, techno-style clothing with glowing elements, with Cybernetic eyes and mechanical accessories, adding to the urban chaos. The composition captures vibrant colors, soft lighting, and intricate details, highlighting the character's emotions and unique charm.",
    width = 896,
    height = 1152,
    type = 0
  }) {
    try {
      const imageBlob = await this._imageUrlToBlob(imageUrl);
      const filename = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
      const encodedPrompt = Buffer.from(prompt).toString("base64");
      const formData = new FormData();
      formData.append("file", imageBlob, filename);
      formData.append("prompt", encodedPrompt);
      formData.append("type", type.toString());
      formData.append("width", width.toString());
      formData.append("height", height.toString());
      const uploadResponse = await axios.post("https://access.vheer.com/api/Vheer/UploadByFile", formData, {
        headers: {
          ...formData.headers,
          ...this.buildHeaders({
            Accept: "application/json, text/plain, */*",
            Referer: "https://vheer.com/",
            "sec-fetch-site": "same-site"
          })
        },
        timeout: 3e4
      });
      if (uploadResponse.data.code !== 200 || !uploadResponse.data.data || !uploadResponse.data.data.code) {
        throw new Error(`Failed to get image code from anime upload: ${uploadResponse.data.msg || "An error occurred"}`);
      }
      const taskCode = uploadResponse.data.data.code;
      const result = await this._pollTaskStatus(taskCode, "anime-portrait", type);
      return result;
    } catch (error) {
      throw error;
    }
  }
  async img2vid({
    imageUrl,
    positive_prompts = 'Photograph of an astronaut in a white spacesuit with an American flag patch, holding a wooden sign that reads "HOUSE BOT," standing on the moon\'s surface with craters and a dark sky backdrop. Extremely detailed, photorealistic, 8k high resolution, RAW footage, ultra realistic, cinematic film',
    negative_prompts = "low quality, bad quality, blurry, pixelated, distorted, poorly drawn, out of focus",
    width = 768,
    height = 1344,
    frameRate = 24,
    videoLength = 5,
    videoFormat = "mp4",
    type = 5
  }) {
    try {
      const imageBlob = await this._imageUrlToBlob(imageUrl);
      const filename = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
      const encodedPositivePrompt = Buffer.from(positive_prompts).toString("base64");
      const encodedNegativePrompt = Buffer.from(negative_prompts).toString("base64");
      const formData = new FormData();
      formData.append("file", imageBlob, filename);
      formData.append("positive_prompts", encodedPositivePrompt);
      formData.append("negative_prompts", encodedNegativePrompt);
      formData.append("type", type.toString());
      formData.append("width", width.toString());
      formData.append("height", height.toString());
      formData.append("frameRate", frameRate.toString());
      formData.append("videoLength", videoLength.toString());
      formData.append("videoFormat", videoFormat);
      const uploadResponse = await axios.post("https://access.vheer.com/api/Vheer/UploadByFile", formData, {
        headers: {
          ...formData.headers,
          ...this.buildHeaders({
            Accept: "application/json, text/plain, */*",
            Referer: "https://vheer.com/",
            "sec-fetch-site": "same-site"
          })
        },
        timeout: 3e4
      });
      if (uploadResponse.data.code !== 200 || !uploadResponse.data.data || !uploadResponse.data.data.code) {
        throw new Error(`Failed to get video code from upload: ${uploadResponse.data.msg || "An error occurred"}`);
      }
      const taskCode = uploadResponse.data.data.code;
      const result = await this._pollTaskStatus(taskCode, "image-to-video", type);
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
        action: "txt2img | img2img | img2prompt | pixar | anime | img2vid"
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
      case "img2prompt":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl (required for ${action})`
          });
        }
        result = await generator.img2prompt(params);
        break;
      case "pixar":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await generator.pixar(params);
        break;
      case "anime":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required fields: imageUrl (required for ${action})`
          });
        }
        result = await generator.anime(params);
        break;
      case "img2vid":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required fields: imageUrl (required for ${action})`
          });
        }
        result = await generator.img2vid(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: txt2img | img2img | img2prompt | pixar | anime | img2vid`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}