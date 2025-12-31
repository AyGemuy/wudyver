import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import qs from "qs";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class MinitoolAI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://minitoolai.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://minitoolai.com/chatGPT/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      }
    }));
    this.urls = {
      base: "https://minitoolai.com",
      cfApi: `https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`,
      chat: {
        page: "https://minitoolai.com/chatGPT/",
        stream: "https://minitoolai.com/chatGPT/chatgpt_stream.php"
      },
      image: {
        pageT2I: "https://minitoolai.com/Image-Generator/",
        apiT2I: "https://minitoolai.com/Image-Generator/imagegeneratorv4.php",
        pageI2I: "https://minitoolai.com/image-to-image/",
        upload: "https://minitoolai.com/image-to-image/upload_image_v2.php",
        apiI2I: "https://minitoolai.com/image-to-image/imgtoimg_v3.php"
      },
      video: {
        page: "https://minitoolai.com/video-generator/",
        api: "https://minitoolai.com/video-generator/video_gen_v2.php"
      }
    };
  }
  log(msg, type = "INFO") {
    console.log(`[${new Date().toLocaleTimeString()}][${type}] ${msg}`);
  }
  async resolveMedia(media) {
    try {
      if (!media) return null;
      this.log("Processing media input...", "MEDIA");
      let buffer, mime, base64;
      if (Buffer.isBuffer(media)) {
        buffer = media;
        mime = "image/jpeg";
      } else if (typeof media === "string" && media.startsWith("http")) {
        this.log("Downloading media from URL...", "MEDIA");
        const res = await axios.get(media, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(res.data);
        mime = res.headers["content-type"] || "image/jpeg";
      } else if (typeof media === "string" && media.startsWith("data:")) {
        const parts = media.split(",");
        mime = parts[0].match(/:(.*?);/)[1];
        buffer = Buffer.from(parts[1], "base64");
      } else {
        return null;
      }
      base64 = `data:${mime};base64,${buffer.toString("base64")}`;
      return {
        buffer: buffer,
        mime: mime,
        base64: base64
      };
    } catch (e) {
      this.log(`Failed to process media: ${e.message}`, "ERROR");
      throw e;
    }
  }
  async getTokens(pageUrl) {
    try {
      this.log(`Fetching authentication tokens for: ${pageUrl}`, "AUTH");
      await this.client.get(pageUrl);
      this.log("Requesting Cloudflare Turnstile token...", "AUTH-CF");
      const cfRes = await axios.get(`${this.urls.cfApi}?ver=v1&sitekey=0x4AAAAAABjI2cBIeVpBYEFi&url=${pageUrl}`);
      const cft = cfRes.data?.token;
      if (!cft) throw new Error("Failed to get CF Token");
      this.log("Scraping internal page tokens...", "AUTH-PAGE");
      const pageRes = await this.client.get(pageUrl);
      const html = pageRes.data;
      const utoken = html.match(/var\s+utoken\s*=\s*"([^"]*)"/)?.[1] || html.match(/utoken\s*:\s*["']([^"']+)["']/)?.[1];
      const safety_identifier = html.match(/var\s+safety_identifier\s*=\s*"([^"]*)"/)?.[1];
      if (!utoken) throw new Error("Failed to scrape utoken from HTML");
      this.log("Tokens acquired successfully", "AUTH-OK");
      return {
        cft: cft,
        utoken: utoken,
        safety_identifier: safety_identifier
      };
    } catch (e) {
      this.log(`Token Fetch Failed: ${e.message}`, "ERROR");
      throw e;
    }
  }
  async generate({
    mode = "chat",
    prompt,
    media,
    ...rest
  }) {
    try {
      this.log(`Starting generation task. Mode: ${mode}`, "START");
      const mediaObj = await this.resolveMedia(media);
      let result;
      if (mode === "chat") {
        result = await this.handleChat(prompt, mediaObj, rest);
      } else if (mode === "image") {
        if (mediaObj) {
          result = await this.handleImg2Img(prompt, mediaObj, rest);
        } else {
          result = await this.handleTxt2Img(prompt, rest);
        }
      } else if (mode === "video") {
        result = await this.handleVideo(prompt, mediaObj, rest);
      } else {
        throw new Error(`Unknown mode: ${mode}`);
      }
      return result;
    } catch (error) {
      this.log(error.message, "FATAL");
      return {
        error: error.message
      };
    }
  }
  async handleChat(prompt, mediaObj, options) {
    try {
      const tokens = await this.getTokens(this.urls.chat.page);
      const payload = {
        messagebase64img1: "",
        messagebase64img0: mediaObj?.base64 || "",
        safety_identifier: tokens.safety_identifier,
        select_model: options.model || "gpt-4o-mini",
        temperature: .7,
        utoken: tokens.utoken,
        message: prompt,
        cft: tokens.cft,
        umes1a: "",
        umes1stimg1a: "",
        umes2ndimg1a: "",
        bres1a: "",
        umes2a: "",
        umes1stimg2a: "",
        umes2ndimg2a: "",
        bres2a: ""
      };
      this.log("Sending Chat Payload to obtain stream token...", "CHAT-INIT");
      const {
        data: streamToken
      } = await this.client.post(this.urls.chat.stream, qs.stringify(payload), {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          referer: this.urls.chat.page
        }
      });
      if (!streamToken || streamToken.length < 10) throw new Error("Invalid stream token received");
      this.log(`Stream Token: ${streamToken.substring(0, 10)}...`, "CHAT-TOKEN");
      this.log("Reading Chat Stream...", "CHAT-STREAM");
      const response = await this.client.get(`${this.urls.chat.stream}?streamtoken=${streamToken}`, {
        responseType: "stream",
        headers: {
          accept: "text/event-stream",
          referer: this.urls.chat.page
        }
      });
      return new Promise((resolve, reject) => {
        let fullText = "";
        let buffer = "";
        response.data.on("data", chunk => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop();
          lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("event:")) return;
            if (trimmed.startsWith("data: ")) {
              const jsonStr = trimmed.substring(6);
              if (jsonStr === "[DONE]") return;
              try {
                const json = JSON.parse(jsonStr);
                const delta = json.delta || json.response?.output?.[0]?.content?.[0]?.text || json.choices?.[0]?.delta?.content || "";
                if (delta) {
                  process.stdout.write(delta);
                  fullText += delta;
                }
              } catch (e) {}
            }
          });
        });
        response.data.on("end", () => {
          console.log("\n");
          this.log("Stream finished", "CHAT-DONE");
          resolve({
            result: fullText,
            type: "text"
          });
        });
        response.data.on("error", err => {
          this.log(`Stream Error: ${err.message}`, "ERROR");
          reject(err);
        });
      });
    } catch (e) {
      throw e;
    }
  }
  async handleTxt2Img(prompt, options) {
    try {
      this.log("Processing Text to Image...", "IMG-T2I");
      const tokens = await this.getTokens(this.urls.image.pageT2I);
      const payload = {
        message: prompt,
        negativeprompt: options.negative_prompt || "",
        model: options.model || "1",
        size: options.size || "1024x1024",
        utoken: tokens.utoken,
        cft: tokens.cft
      };
      this.log("Sending generation request...", "IMG-GEN");
      const {
        data
      } = await this.client.post(this.urls.image.apiT2I, qs.stringify(payload), {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          referer: this.urls.image.pageT2I
        }
      });
      if (typeof data === "string" && data.includes("https://")) {
        this.log("Image generated successfully", "SUCCESS");
        return {
          result: data,
          type: "image"
        };
      }
      throw new Error(`Generation failed: ${data}`);
    } catch (e) {
      throw e;
    }
  }
  async handleImg2Img(prompt, mediaObj, options) {
    try {
      this.log("Processing Image to Image...", "IMG-I2I");
      const tokens = await this.getTokens(this.urls.image.pageI2I);
      this.log("Uploading reference image...", "IMG-UPLOAD");
      const form = new FormData();
      form.append("file", mediaObj.buffer, {
        filename: "ref.jpg",
        contentType: mediaObj.mime
      });
      form.append("utoken", tokens.utoken);
      const {
        data: uploadData
      } = await this.client.post(this.urls.image.upload, form, {
        headers: {
          ...form.getHeaders(),
          referer: this.urls.image.pageI2I
        }
      });
      if (typeof uploadData !== "string" || !uploadData.includes("@@@###@@@")) {
        throw new Error(`Upload failed: ${uploadData}`);
      }
      const [_, resourceId] = uploadData.split("@@@###@@@");
      this.log(`Image uploaded. Resource ID: ${resourceId}`, "IMG-UPLOAD");
      const payload = {
        size: options.size || "1024x1024",
        denoising_strength: options.strength || .7,
        resource_img_id: resourceId,
        inputtext: prompt,
        negative_prompt: options.negative_prompt || "",
        style: options.style || "",
        color: options.color || "",
        lighting: options.lighting || "",
        composition: options.composition || "",
        utoken: tokens.utoken
      };
      this.log("Sending transform request...", "IMG-GEN");
      const {
        data
      } = await this.client.post(this.urls.image.apiI2I, qs.stringify(payload), {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          referer: this.urls.image.pageI2I
        }
      });
      if (typeof data === "string" && data.includes("https://")) {
        this.log("Image transformed successfully", "SUCCESS");
        return {
          result: data,
          type: "image"
        };
      }
      throw new Error(`Transformation failed: ${data}`);
    } catch (e) {
      throw e;
    }
  }
  async handleVideo(prompt, mediaObj, options) {
    try {
      const modeType = mediaObj ? "i2v" : "t2v";
      this.log(`Processing Video (${modeType.toUpperCase()})...`, "VIDEO-INIT");
      const tokens = await this.getTokens(this.urls.video.page);
      const form = new FormData();
      if (modeType === "i2v") {
        form.append("file", mediaObj.buffer, {
          filename: "input.jpg",
          contentType: mediaObj.mime
        });
      }
      form.append("mode", modeType);
      form.append("model", options.model || "standard");
      form.append("prompt", prompt);
      form.append("aspect_ratio", options.ratio || "1280:720");
      form.append("duration", options.duration || "5");
      form.append("style", options.style || "");
      form.append("motion", options.motion || "");
      form.append("mood", options.mood || "");
      form.append("price", "0.065");
      form.append("utoken", tokens.utoken);
      this.log("Sending video generation request (This may take ~60s)...", "VIDEO-GEN");
      const {
        data
      } = await this.client.post(this.urls.video.api, form, {
        headers: {
          ...form.getHeaders(),
          referer: this.urls.video.page
        },
        timeout: 12e4
      });
      if (typeof data === "string") {
        let videoUrl = "";
        if (data.includes("outputs/")) {
          videoUrl = `https://minitoolai.com/${data}`;
        } else if (data.startsWith("https://")) {
          videoUrl = data;
        }
        if (videoUrl) {
          this.log("Video generated successfully", "SUCCESS");
          return {
            result: videoUrl,
            type: "video"
          };
        }
      }
      throw new Error(`Video generation failed: ${data}`);
    } catch (e) {
      throw e;
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
  const api = new MinitoolAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}