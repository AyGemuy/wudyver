import axios from "axios";
import crypto from "crypto";
import CryptoJS from "crypto-js";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
const API_BASE_URL = "https://apiv1.deepfakemaker.io/api";
const APP_ID = "ai_df";
const SECRET_STRING = "NHGNy5YFz7HeFb";
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDa2oPxMZe71V4dw2r8rHWt59gH
W5INRmlhepe6GUanrHykqKdlIB4kcJiu8dHC/FJeppOXVoKz82pvwZCmSUrF/1yr
rnmUDjqUefDu8myjhcbio6CnG5TtQfwN2pz3g6yHkLgp8cFfyPSWwyOCMMMsTU9s
snOjvdDb4wiZI8x3UwIDAQAB
-----END PUBLIC KEY-----`;
class DeepFakeAPI {
  constructor() {
    this.userId = this._generateUserId();
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "access-control-allow-credentials": "true",
      "content-type": "application/json",
      origin: "https://deepfakemaker.io",
      priority: "u=1, i",
      referer: "https://deepfakemaker.io/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.config = {
      endpoints: {
        flux: {
          task: `${API_BASE_URL}/replicate/v1/free/flux/task`,
          list: `${API_BASE_URL}/replicate/v1/free/flux/list`
        },
        text_flux: {
          task: `${API_BASE_URL}/replicate/v1/free/text/flux/task`
        },
        nano_banana: {
          task: `${API_BASE_URL}/replicate/v1/free/nano/banana/task`
        },
        upload: `${API_BASE_URL}/user/v2/upload-sign`
      },
      platforms: {
        "ai-disney": "viking",
        halloween: "halloween_filter",
        lego: "lego",
        silhouette: "silhouette_maker",
        anime: "anime",
        remove: "fliter_remove",
        pfp: "anime_pfp_maker",
        img2img: "img2img",
        "nano-banana": "nano_banana",
        polybuzz: "polybuzz",
        txt2img: "text2img"
      },
      statusCodes: {
        PENDING: 0,
        PROCESSING: 1,
        COMPLETED: 2,
        FAILED: 3
      }
    };
    console.log(`Proses dimulai dengan User ID: ${this.userId}`);
  }
  _generateUserId() {
    return crypto.randomBytes(32).toString("hex");
  }
  _getAuthParams() {
    console.log("Membuat parameter otentikasi...");
    try {
      const timestamp = Math.floor(Date.now() / 1e3);
      const nonce = crypto.randomUUID();
      const aesKey = crypto.randomBytes(8).toString("hex");
      const secretKeyEncrypted = crypto.publicEncrypt({
        key: PUBLIC_KEY,
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, Buffer.from(aesKey, "utf8")).toString("base64");
      const stringToSign = `${APP_ID}:${SECRET_STRING}:${timestamp}:${nonce}:${secretKeyEncrypted}`;
      const key = CryptoJS.enc.Utf8.parse(aesKey);
      const iv = CryptoJS.enc.Utf8.parse(aesKey);
      const encrypted = CryptoJS.AES.encrypt(stringToSign, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      const sign = encrypted.toString();
      const authParams = {
        app_id: APP_ID,
        t: timestamp,
        nonce: nonce,
        sign: sign,
        secret_key: secretKeyEncrypted
      };
      console.log("Paramenter otentikasi berhasil dibuat.");
      return authParams;
    } catch (error) {
      console.error("Gagal membuat parameter otentikasi:", error);
      throw new Error("Gagal dalam proses otentikasi.");
    }
  }
  async _getImageBuffer(imageSource) {
    console.log("Memproses sumber gambar...");
    if (Buffer.isBuffer(imageSource)) {
      console.log("Sumber gambar adalah Buffer.");
      return imageSource;
    }
    if (typeof imageSource === "string") {
      if (imageSource.startsWith("http")) {
        console.log("Mengunduh gambar dari URL...");
        const response = await axios.get(imageSource, {
          responseType: "arraybuffer"
        });
        return Buffer.from(response.data);
      }
      console.log("Mengonversi gambar dari Base64.");
      return Buffer.from(imageSource, "base64");
    }
    throw new Error("Format imageUrl tidak didukung. Harap gunakan URL, Base64, atau Buffer.");
  }
  async _upload(imageBuffer) {
    console.log("Memulai proses unggah gambar...");
    try {
      const imageHash = crypto.createHash("sha256").update(imageBuffer).digest("hex");
      const filename = `image_${Date.now()}.jpg`;
      console.log("Meminta URL unggah terotorisasi...");
      const signResponse = await axios.post(this.config.endpoints.upload, {
        filename: filename,
        hash: imageHash,
        user_id: this.userId
      }, {
        params: this._getAuthParams(),
        headers: this.headers
      });
      const uploadUrl = signResponse?.data?.data?.url;
      const objectName = signResponse?.data?.data?.object_name;
      if (!uploadUrl) throw new Error("Gagal mendapatkan URL unggah dari API.");
      console.log("URL unggah berhasil didapatkan.");
      console.log("Mengunggah gambar ke penyimpanan...");
      await axios.put(uploadUrl, imageBuffer, {
        headers: {
          "Content-Type": "image/jpeg"
        }
      });
      console.log("Gambar berhasil diunggah.");
      return `https://cdn.deepfakemaker.io/${objectName}`;
    } catch (error) {
      console.error("Proses unggah gagal:", error?.response?.data || error.message);
      throw new Error("Gagal mengunggah gambar.");
    }
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    mode = "img2img",
    ...rest
  }) {
    console.log(`\nMemulai tugas generasi [${mode}] dengan prompt: "${prompt}"`);
    try {
      const platform = this.config.platforms[mode] || mode;
      const outputFormat = rest.outputFormat || "png";
      let uploadedImageUrl = null;
      let uploadedImageUrls = [];
      if (imageUrl) {
        if (mode === "nano-banana") {
          const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
          for (const url of imageUrls) {
            const imageBuffer = await this._getImageBuffer(url);
            const uploadedUrl = await this._upload(imageBuffer);
            uploadedImageUrls.push(uploadedUrl);
          }
        } else {
          const imageBuffer = await this._getImageBuffer(imageUrl);
          uploadedImageUrl = await this._upload(imageBuffer);
        }
      }
      console.log(`Mengirim permintaan untuk membuat tugas [${mode}]...`);
      let payload = {
        prompt: prompt,
        user_id: this.userId,
        ...rest
      };
      let endpoint;
      if (mode === "txt2img") {
        endpoint = this.config.endpoints.text_flux.task;
        payload.image_size = rest.image_size || 1024;
        payload.aspect_ratio = rest.aspect_ratio || "3:2";
        payload.platform = platform;
        payload.speed_mode = rest.speed_mode || "Lightly Juiced 🍊 (more consistent)";
      } else if (mode === "polybuzz") {
        endpoint = this.config.endpoints.flux.task;
        payload.output_format = outputFormat;
        payload.aspect_ratio = rest.aspect_ratio || "3:2";
        payload.platform = platform;
        payload.image = uploadedImageUrl;
      } else if (mode === "nano-banana") {
        endpoint = this.config.endpoints.nano_banana.task;
        payload.images = uploadedImageUrls;
      } else {
        endpoint = this.config.endpoints.flux.task;
        payload.platform = platform;
        payload.output_format = outputFormat;
        payload.image = uploadedImageUrl;
        if (mode === "ai-disney") {
          payload.prompt = `Transform ${prompt} into a high-quality Disney-style animated scene. Preserve all original details, including character appearance, clothing, composition, and background. Add soft lighting, expressive eyes, glowing atmosphere, magical sparkles, and a painterly fairytale aesthetic.Other ideas about how to edit my image`;
          payload.aspect_ratio = "3:2";
        } else if (mode === "halloween") {
          payload.prompt = `Keep the original features and details of the character, add Halloween makeup: {Makeup}. Change the clothes to: {clothes}. Change the background to: {background}. Other ideas about how to edit my image:${prompt}`;
          payload.aspect_ratio = "3:2";
        } else if (mode === "lego") {
          payload.prompt = `Render the content in {the uploaded image or the scene description provided by the user} entirely in Lego style. Keep all original elements, subjects, and composition exactly the same. Represent any people or animals as smooth, fully-formed Lego figures.Only transform the visual appearance into realistic Lego bricks and textures, without adding or removing anything.Other ideas about how to edit my image:${prompt}`;
          payload.aspect_ratio = "3:2";
        } else if (mode === "silhouette") {
          payload.prompt = `Transform the objects in the image into clean solid black silhouettes while perfectly preserving the original background. Additional styling: ${prompt}`;
          payload.aspect_ratio = "3:2";
        } else if (mode === "anime") {
          payload.prompt = `Turn the image into anime style.\nOther ideas about how to edit my image: ${prompt}`;
          payload.aspect_ratio = "3:2";
        } else if (mode === "remove") {
          payload.prompt = `Remove the filter from this photo while keeping all other aspects of the image intact. Retain the original skin tones, lighting, and details, ensuring the photo looks as natural as possible without altering the composition or background.Other ideas about how to edit my image: ${prompt}`;
          payload.aspect_ratio = "3:2";
        } else if (mode === "pfp") {
          payload.prompt = `Convert the provided image into a high-quality ${prompt} style illustration. Preserve the core composition, subjects, and key details of the original image, while enhancing it with the distinct visual characteristics of the anime style, including its signature linework, vibrant color palette, and refined aesthetic. Ensure the result is polished, expressive, and true to the chosen anime style.`;
          payload.aspect_ratio = "3:2";
        } else if (mode === "img2img") {
          payload.aspect_ratio = "match_input_image";
        }
      }
      const response = await axios.post(endpoint, payload, {
        params: this._getAuthParams(),
        headers: this.headers
      });
      console.log("Respons pembuatan tugas:", response?.data);
      const task_id = response?.data?.data?.task_id || null;
      if (!task_id) {
        throw new Error("Gagal mendapatkan task_id dari respons API.");
      }
      return await this.autoPolling({
        task_id: task_id,
        mode: mode
      });
    } catch (error) {
      console.error(`Gagal membuat tugas [${mode}]:`, error?.response?.data || error.message);
      return null;
    }
  }
  async status({
    task_id,
    mode = "img2img",
    ...rest
  }) {
    console.log(`\nMemeriksa status [${mode}] untuk ID tugas: ${task_id}`);
    if (!task_id) {
      console.error("ID tugas tidak disediakan.");
      return null;
    }
    try {
      let endpoint;
      if (mode === "nano-banana") {
        endpoint = this.config.endpoints.nano_banana.task;
      } else if (mode === "txt2img") {
        endpoint = this.config.endpoints.text_flux.task;
      } else {
        endpoint = this.config.endpoints.flux.task;
      }
      const params = {
        ...this._getAuthParams(),
        task_id: task_id,
        user_id: this.userId,
        ...rest
      };
      console.log(`Mengambil status tugas [${mode}] dari API...`);
      const response = await axios.get(endpoint, {
        params: params,
        headers: this.headers
      });
      const result = response?.data || null;
      console.log("Respons status:", result);
      if (result && (result.msg === "success" || result.msg === "processing")) {
        return {
          success: true,
          msg: result.msg,
          data: result.data,
          status: result.data?.status,
          progress: result.data?.progress || 0,
          generate_url: result.data?.generate_url
        };
      }
      return {
        success: false,
        error: result?.msg || "Task not found or failed",
        data: result
      };
    } catch (error) {
      console.error(`Gagal memeriksa status tugas [${mode}]:`, error?.response?.data || error.message);
      return {
        success: false,
        error: error?.response?.data || error.message
      };
    }
  }
  async autoPolling({
    task_id,
    mode = "img2img",
    interval = 3e3,
    maxAttempts = 60
  }) {
    console.log(`Memulai auto-polling untuk tugas [${mode}] ID: ${task_id}`);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Polling attempt ${attempt}/${maxAttempts}`);
      try {
        const statusResult = await this.status({
          task_id: task_id,
          mode: mode
        });
        if (statusResult.success) {
          if (statusResult.generate_url) {
            console.log("Tugas selesai! URL telah dibuat.");
            return {
              success: true,
              completed: true,
              data: statusResult.data,
              generate_url: statusResult.generate_url,
              attempt: attempt
            };
          }
          if (statusResult.status === this.config.statusCodes.FAILED) {
            console.error("Tugas gagal!");
            return {
              success: false,
              completed: true,
              error: "Task failed",
              data: statusResult.data,
              status: statusResult.status,
              attempt: attempt
            };
          }
          const progress = statusResult.progress || 0;
          const statusText = this.getStatusText(statusResult.status);
          console.log(`Progress: ${progress}%, Status: ${statusText}, Pesan API: ${statusResult.msg}`);
        } else {
          console.error(`Pemeriksaan status gagal: ${statusResult.error}`);
        }
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } catch (error) {
        console.error(`Error pada polling attempt ${attempt}:`, error);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
    }
    console.error("Auto-polling timeout setelah maksimum attempts");
    return {
      success: false,
      completed: false,
      error: "Timeout",
      attempt: maxAttempts
    };
  }
  getStatusText(statusCode) {
    const statusMap = {
      0: "Pending",
      1: "Processing",
      2: "Completed",
      3: "Failed"
    };
    return statusMap[statusCode] ?? "Unknown";
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl && params.mode !== "txt2img") {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  try {
    const client = new DeepFakeAPI();
    const response = await client.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}