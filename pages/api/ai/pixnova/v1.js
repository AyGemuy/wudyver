import axios from "axios";
import https from "https";
import crypto from "crypto";
import CryptoJS from "crypto-js";
import {
  v4 as uuidv4
} from "uuid";
import FormData from "form-data";
class PixnovaClient {
  constructor() {
    this.API_BASE_URL = "https://api.pixnova.ai";
    this.OSS_BASE_URL = "https://oss-global.pixnova.ai";
    this.HT = "pixnova";
    this.CI = "1H5tRtzsBkqXcaJ";
    this.PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`;
    this.brandId = 2;
    this.originFrom = this._genHex(16);
    this.fp = this._genHex(32);
    this.themeVersion = "83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q";
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    this.TOOLS = [{
      name: "ai-body",
      fn_name: "demo-ai-body-v1",
      endpoint: "/aitools/of",
      call_type: 3,
      default_payload: {
        prompt: "(masterpiece), best quality, expressive eyes, perfect face",
        model: "AbsoluteReality_v1.8.1.safetensors",
        lora: [],
        negative_prompt: "(worst quality, low quality:1.4), (greyscale, monochrome:1.1), cropped, lowres , username, blurry, trademark, watermark, title, multiple view, Reference sheet, curvy, plump, fat, strabismus, clothing cutout, side slit,worst hand, (ugly face:1.2), extra leg, extra arm, bad foot, text, name",
        cfg: 7
      }
    }, {
      name: "text2image",
      fn_name: "demo-text2image-series",
      endpoint: "/aitools/rp",
      call_type: 1,
      default_payload: {
        style: "dark-fantasy",
        prompt: "a girl, in the garden",
        radio: "9:16"
      }
    }, {
      name: "image2image",
      fn_name: "demo-image2image-series",
      endpoint: "/aitools/of",
      call_type: 3,
      uploader: "aitools",
      default_payload: {
        style_name: "ghibli",
        prompt: "(masterpiece), best quality",
        negative_prompt: "(worst quality, low quality:1.4), (greyscale, monochrome:1.1), cropped, lowres , username, blurry, trademark, watermark, title, multiple view, Reference sheet, curvy, plump, fat, strabismus, clothing cutout, side slit,worst hand, (ugly face:1.2), extra leg, extra arm, bad foot, text, name"
      }
    }, {
      name: "photo2anime",
      fn_name: "demo-photo2anime",
      endpoint: "/aitools/of",
      call_type: 3,
      uploader: "aitools",
      default_payload: {
        model: "MeinaHentai_v4.safetensors"
      }
    }, {
      name: "cloth-change",
      fn_name: "cloth-change",
      endpoint: "/aitools/of",
      call_type: 3,
      uploader: "aitools",
      default_payload: {
        prompt: "change clothes",
        cloth_type: "full_outfits",
        type: 1
      }
    }, {
      name: "change-hair",
      fn_name: "demo-change-hair",
      endpoint: "/aitools/of",
      call_type: 3,
      uploader: "aitools",
      default_payload: {
        prompt: "Change the hairstyle of the person in the picture to a new, stylish one."
      }
    }, {
      name: "image-editor",
      fn_name: "demo-image-editor",
      endpoint: "/api/pn/v1/aikit",
      call_type: 1,
      uploader: "put",
      default_payload: {
        prompt: "edit image",
        model_name: "flux-kontext-dev",
        aspect_ratio: "original"
      }
    }];
  }
  _genHex(length) {
    return Array.from({
      length: length
    }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  _getBaseHeaders() {
    return {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      origin: "https://pixnova.ai",
      referer: "https://pixnova.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "theme-version": this.themeVersion
    };
  }
  _generateRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from(crypto.randomBytes(length)).map(b => chars[b % chars.length]).join("");
  }
  _generateNonce() {
    return uuidv4();
  }
  _aesEncryptWithCryptoJS(data, key, iv) {
    const keyParsed = CryptoJS.enc.Utf8.parse(key);
    const ivParsed = CryptoJS.enc.Utf8.parse(iv);
    const dataParsed = CryptoJS.enc.Utf8.parse(data);
    const encrypted = CryptoJS.AES.encrypt(dataParsed, keyParsed, {
      iv: ivParsed,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
  }
  _signForApi(fp) {
    const t = Math.floor(new Date().getTime() / 1e3);
    const nonce = this._generateNonce();
    const aesSecret = this._generateRandomString(16);
    const secret_key = crypto.publicEncrypt({
      key: this.PUBLIC_KEY,
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, Buffer.from(aesSecret)).toString("base64");
    const dataToSign = `${this.HT}:${this.CI}:${t}:${nonce}:${secret_key}`;
    const sign = this._aesEncryptWithCryptoJS(dataToSign, aesSecret, aesSecret);
    const fp1 = this._aesEncryptWithCryptoJS(`${this.HT}:${fp}`, aesSecret, aesSecret);
    return {
      fp: fp,
      fp1: fp1,
      "x-guide": secret_key,
      _internal: {
        t: t,
        nonce: nonce,
        sign: sign
      }
    };
  }
  _signForUpload() {
    const t = Math.floor(new Date().getTime() / 1e3);
    const nonce = this._generateNonce();
    const aesSecret = this._generateRandomString(16);
    const secret_key = crypto.publicEncrypt({
      key: this.PUBLIC_KEY,
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, Buffer.from(aesSecret)).toString("base64");
    const dataToSign = `${this.HT}:${nonce}:${secret_key}`;
    const sign = this._aesEncryptWithCryptoJS(dataToSign, aesSecret, aesSecret);
    return {
      "x-guide": secret_key,
      "x-sign": sign,
      _internal: {
        t: t,
        nonce: nonce
      }
    };
  }
  async _getImageData(imageInput) {
    if (typeof imageInput === "string" && imageInput.startsWith("http")) {
      const response = await axios.get(imageInput, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      const fileName = imageInput.split("/").pop()?.split("?")[0] || `img_${Date.now()}.jpg`;
      return {
        buffer: buffer,
        fileName: fileName
      };
    } else if (Buffer.isBuffer(imageInput)) {
      return {
        buffer: imageInput,
        fileName: `buffer_${Date.now()}.jpg`
      };
    } else if (typeof imageInput === "string" && imageInput.startsWith("data:")) {
      const [header, data] = imageInput.split(",");
      const ext = header.match(/data:image\/(\w+)/)?.[1] || "jpg";
      const buffer = Buffer.from(data, "base64");
      return {
        buffer: buffer,
        fileName: `base64_${Date.now()}.${ext}`
      };
    }
    throw new Error("Invalid image input format. Use URL, Buffer, or Base64 string.");
  }
  async uploadImgAitools(imageInput, toolName) {
    try {
      console.log(`🔄 [AITools Uploader] Processing image for: ${toolName}`);
      const {
        buffer,
        fileName
      } = await this._getImageData(imageInput);
      const form = new FormData();
      form.append("file", buffer, {
        filename: fileName
      });
      form.append("fn_name", toolName);
      const authHeaders = this._signForApi(this.fp);
      const headers = {
        ...this._getBaseHeaders(),
        ...form.getHeaders(),
        fp: authHeaders.fp,
        fp1: authHeaders.fp1,
        "x-guide": authHeaders["x-guide"],
        "x-code": Date.now().toString()
      };
      const response = await axios.post(`${this.API_BASE_URL}/aitools/upload-img`, form, {
        headers: headers,
        httpsAgent: this.httpsAgent
      });
      if (response.data?.code !== 200 || !response.data?.data?.path) {
        throw new Error(response.data?.message || "Failed to get image path from aitools uploader");
      }
      console.log(`✅ [AITools Uploader] Upload successful. Path: ${response.data.data.path}`);
      return response.data.data.path;
    } catch (error) {
      const errMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error(`❌ [AITools Uploader] Upload failed: ${errMsg}`);
      throw new Error(`AITools upload failed: ${errMsg}`);
    }
  }
  async uploadFilePut(imageInput) {
    try {
      console.log("🔄 [PUT Uploader] Processing image input...");
      const {
        buffer,
        fileName
      } = await this._getImageData(imageInput);
      console.log("🔄 [PUT Uploader] Step 1: Requesting upload URL...");
      const uploadSig = this._signForUpload();
      const uploadHeaders = {
        ...this._getBaseHeaders(),
        "content-type": "application/json",
        ...uploadSig
      };
      const uploadReq = {
        file_name: fileName,
        type: "image",
        request_from: this.brandId,
        origin_from: this.originFrom
      };
      const uploadResp = await axios.post(`${this.API_BASE_URL}/api/upload_file`, uploadReq, {
        headers: uploadHeaders,
        httpsAgent: this.httpsAgent
      });
      const presignedUrl = uploadResp.data?.data?.url;
      if (!presignedUrl) throw new Error("No upload URL received from PUT uploader");
      console.log("🔄 [PUT Uploader] Step 2: Uploading via PUT...");
      const mimeType = `image/${fileName.split(".").pop()?.toLowerCase() || "jpeg"}`;
      await axios.put(presignedUrl, buffer, {
        headers: {
          "Content-Type": mimeType,
          "x-oss-storage-class": "Standard"
        }
      });
      const imagePath = new URL(presignedUrl.split("?")[0]).pathname.substring(1);
      console.log(`✅ [PUT Uploader] Upload successful. Path: ${imagePath}`);
      return imagePath;
    } catch (error) {
      const errMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error(`❌ [PUT Uploader] Upload failed: ${errMsg}`);
      throw new Error(`PUT upload failed: ${errMsg}`);
    }
  }
  async createTask(tool, payload) {
    try {
      console.log(`🎨 Creating task for tool: ${tool.name}...`);
      const apiSig = this._signForApi(this.fp);
      const headers = {
        ...this._getBaseHeaders(),
        "content-type": "application/json",
        fp: apiSig.fp,
        fp1: apiSig.fp1,
        "x-guide": apiSig["x-guide"],
        "x-code": Date.now().toString()
      };
      const url = `${this.API_BASE_URL}${tool.endpoint}/create`;
      const response = await axios.post(url, payload, {
        headers: headers,
        httpsAgent: this.httpsAgent
      });
      const taskId = response.data?.data?.task_id;
      if (!taskId) throw new Error(`Task creation failed: ${response.data?.message || "No task ID received"}`);
      console.log(`📋 Task created with ID: ${taskId}`);
      return taskId;
    } catch (error) {
      const errMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error(`❌ Task creation failed: ${errMsg}`);
      throw new Error(`Task creation failed: ${errMsg}`);
    }
  }
  async checkStatus(tool, taskId) {
    try {
      const apiSig = this._signForApi(this.fp);
      const headers = {
        ...this._getBaseHeaders(),
        "content-type": "application/json",
        fp: apiSig.fp,
        fp1: apiSig.fp1,
        "x-guide": apiSig["x-guide"],
        "x-code": Date.now().toString()
      };
      const isImageEditor = tool.fn_name === "demo-image-editor";
      const endpoint = isImageEditor ? "check_status" : "check-status";
      const callType = isImageEditor ? 1 : tool.call_type;
      const url = `${this.API_BASE_URL}${tool.endpoint}/${endpoint}`;
      const payload = {
        task_id: taskId,
        fn_name: tool.fn_name,
        call_type: callType,
        request_from: this.brandId,
        origin_from: this.originFrom
      };
      const response = await axios.post(url, payload, {
        headers: headers,
        httpsAgent: this.httpsAgent
      });
      return response.data?.data || {};
    } catch (error) {
      const errMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error(`❌ Status check failed: ${errMsg}`);
      throw new Error(`Status check failed: ${errMsg}`);
    }
  }
  async poll(tool, taskId, maxAttempts = 60, interval = 3e3) {
    console.log(`⏳ Starting polling for task ID: ${taskId}`);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔍 Polling attempt ${attempt}/${maxAttempts}...`);
      const statusResult = await this.checkStatus(tool, taskId);
      if (statusResult.status === 2) {
        console.log("✅ Task completed successfully!");
        return {
          success: true,
          data: statusResult
        };
      }
      if (statusResult.status === 3) {
        console.error("❌ Task failed.");
        return {
          success: false,
          error: "Task failed",
          data: statusResult
        };
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error("Polling timeout reached");
  }
  async generate({
    tool,
    imageUrl,
    ...input
  }) {
    try {
      console.log(`🚀 Starting generation with tool: "${tool}"`);
      const selectedTool = this.TOOLS.find(t => t.name === tool);
      if (!selectedTool) {
        throw new Error(`Tool "${tool}" not found. Available tools: ${this.TOOLS.map(t => t.name).join(", ")}`);
      }
      if (selectedTool.uploader && !imageUrl) {
        throw new Error(`Tool "${tool}" requires an 'imageUrl', but it was not provided.`);
      }
      let imagePath = null;
      if (imageUrl) {
        if (selectedTool.uploader === "aitools") {
          imagePath = await this.uploadImgAitools(imageUrl, selectedTool.fn_name);
        } else if (selectedTool.uploader === "put") {
          imagePath = await this.uploadFilePut(imageUrl);
        }
        if (imagePath) {
          input.source_image = imagePath;
        }
      }
      const defaultPayload = selectedTool.default_payload || {};
      const finalInput = {
        ...defaultPayload,
        ...input
      };
      const payload = {
        fn_name: selectedTool.fn_name,
        call_type: selectedTool.call_type,
        input: {
          ...finalInput,
          request_from: this.brandId
        },
        request_from: this.brandId,
        origin_from: this.originFrom
      };
      const taskId = await this.createTask(selectedTool, payload);
      const pollResult = await this.poll(selectedTool, taskId);
      if (pollResult.success) {
        console.log("🎉 Generation finished successfully! Formatting result...");
        const data = pollResult.data;
        const resultImage = data.result_image || data.result && data.result.image_path;
        if (!resultImage) {
          throw new Error("Image path not found in the successful API response.");
        }
        return {
          success: true,
          result: selectedTool.fn_name === "demo-image-editor" ? resultImage : `${this.OSS_BASE_URL}/${resultImage}`,
          ...selectedTool.fn_name !== "demo-image-editor" && {
            length: data.r_len || null
          }
        };
      } else {
        console.error("💥 Generation failed:", pollResult.error);
        return pollResult;
      }
    } catch (error) {
      console.error(`🚨 Generation process failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const client = new PixnovaClient();
    const response = await client.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}