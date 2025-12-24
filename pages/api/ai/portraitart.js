import axios from "axios";
import crypto from "crypto";
async function toDataURI(input) {
  try {
    if (typeof input === "string" && input.startsWith("data:")) {
      console.log("✅ Input sudah berupa data URI");
      return input;
    }
    if (typeof input === "string" && (input.startsWith("http://") || input.startsWith("https://"))) {
      console.log("🌐 Download image dari URL:", input);
      const response = await axios.get(input, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      const contentType = response.headers["content-type"] || "image/jpeg";
      const base64 = buffer.toString("base64");
      console.log("✅ URL berhasil dikonversi ke data URI");
      return `data:${contentType};base64,${base64}`;
    }
    if (Buffer.isBuffer(input)) {
      console.log("📦 Konversi Buffer ke data URI");
      const base64 = input.toString("base64");
      console.log("✅ Buffer berhasil dikonversi ke data URI");
      return `data:image/jpeg;base64,${base64}`;
    }
    if (typeof input === "string") {
      console.log("🔤 Tambahkan prefix data URI ke base64 string");
      return `data:image/jpeg;base64,${input}`;
    }
    throw new Error("Format input tidak didukung");
  } catch (error) {
    console.error("❌ Gagal konversi ke data URI:", error.message);
    throw error;
  }
}
async function convertImagesToDataURI(images) {
  if (!images) {
    return [];
  }
  if (!Array.isArray(images)) {
    images = [images];
  }
  images = images.filter(img => img !== null && img !== undefined && img !== "");
  const results = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    console.log(`🔄 Konversi image ${i + 1}/${images.length}...`);
    const dataURI = await toDataURI(img);
    results.push(dataURI);
  }
  console.log(`✅ Total ${results.length} image(s) berhasil dikonversi`);
  return results;
}
class ApiClient {
  constructor() {
    this.config = {
      baseURL: "https://api.portraitart.ai",
      endpoints: {
        uploadImages: "/uploadImages",
        generatePrompts: "/generatePrompts",
        generatePortrait: "/generatePortrait",
        imageSuperEnhance: "/imageSuperEnhance"
      },
      auth: {
        identityToolkit: "https://identitytoolkit.googleapis.com/v1/accounts:signUp",
        apiKey: "AIzaSyCfTndyVH36HOspM1jefheZbk2-QWFZM2k"
      }
    };
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: 12e4
    });
    this.axiosInstance.interceptors.request.use(async config => {
      try {
        console.log("🔄 Memulai proses attach token ke request...");
        const token = await this.getAutoIdToken();
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        console.log("✅ Token berhasil dilampirkan ke header request");
      } catch (error) {
        console.error("❌ Gagal melampirkan token:", error.message);
      }
      return config;
    });
  }
  async getAutoIdToken() {
    try {
      console.log("🔑 Memulai proses mendapatkan ID token dari Firebase...");
      const response = await axios.post(this.config.auth.identityToolkit, {
        returnSecureToken: true
      }, {
        params: {
          key: this.config.auth.apiKey
        },
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log("✅ ID token berhasil didapatkan");
      return response.data.idToken;
    } catch (error) {
      console.error("❌ Gagal mendapatkan ID token:", error.message);
      console.error("Detail error (Stringified):", JSON.stringify(error.response?.data || error.message, null, 2));
      throw new Error(`Failed to get ID token: ${error.message}`);
    }
  }
  async postRequest(endpoint, data = {}) {
    try {
      console.log(`🚀 Memulai POST request ke ${endpoint}`);
      const response = await this.axiosInstance.post(endpoint, data);
      console.log(`✅ POST request ke ${endpoint} berhasil`);
      console.log("📄 Log Response Data:", JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.log("📄 Log Error Response Data:", JSON.stringify(error.response?.data || null, null, 2));
      const errorLog = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      };
      console.error(`❌ Gagal POST request ke ${endpoint}:`, JSON.stringify(errorLog, null, 2));
      throw error;
    }
  }
  async uploadImagesPresign(images) {
    try {
      console.log("📤 Memulai upload images dengan presign...");
      if (!images || Array.isArray(images) && images.length === 0) {
        throw new Error("Images tidak boleh kosong");
      }
      const dataURIs = await convertImagesToDataURI(images);
      if (dataURIs.length === 0) {
        throw new Error("Tidak ada image yang valid untuk di-upload");
      }
      console.log(`✅ Berhasil konversi ${dataURIs.length} image(s) ke data URI`);
      const presignPayload = {
        images: dataURIs.map((_, index) => ({
          name: `image_${Date.now()}_${index}.jpg`,
          type: "image/jpeg"
        }))
      };
      const presignResponse = await this.postRequest(this.config.endpoints.uploadImages, presignPayload);
      console.log("✅ Presigned URLs berhasil didapatkan");
      const uploadedUrls = [];
      for (let i = 0; i < dataURIs.length; i++) {
        const dataURI = dataURIs[i];
        const presignData = presignResponse.images[i];
        const base64Data = dataURI.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        await axios.put(presignData.uploadUrl, buffer, {
          headers: {
            "Content-Type": "image/jpeg"
          }
        });
        console.log(`✅ Image ${i + 1}/${dataURIs.length} berhasil di-upload`);
        uploadedUrls.push(presignData.imageUrl);
      }
      console.log("✅ Semua images berhasil di-upload");
      return {
        success: true,
        imageUrls: uploadedUrls,
        dataURIs: dataURIs,
        count: uploadedUrls.length
      };
    } catch (error) {
      console.error("❌ Upload images presign gagal:", error.message);
      throw error;
    }
  }
  async prompter({
    prompt = "",
    num: promptNumber = 1,
    style = "professional",
    mood = "neutral",
    ...rest
  } = {}) {
    try {
      console.log("💭 Memulai generate prompt...");
      const payload = {
        promptNumber: promptNumber,
        basicThoughts: prompt,
        style: style,
        mood: mood,
        ...rest
      };
      const result = await this.postRequest(this.config.endpoints.generatePrompts, payload);
      console.log("✅ Generate prompt berhasil");
      return result;
    } catch (error) {
      console.error("❌ Generate prompt gagal:", error.message);
      throw error;
    }
  }
  async portrait({
    prompt = "",
    imageUrl: image = [],
    idSimilary = .8,
    method: generationMethod = "GEN-PLU",
    seed = Math.floor(Math.random() * 1e5),
    mode: generationMode = "PROMPT_MODE",
    template: templateImageUrl = "",
    platform = "ANDROID",
    packageName = "portrait-art-nodejs",
    gitVersion = "7075e4d",
    width: outputImageWidth = 768,
    height: outputImageHeight = 1024,
    ...rest
  } = {}) {
    try {
      console.log("🎨 Memulai generate portrait...");
      const dataURIs = await convertImagesToDataURI(image);
      console.log(`✅ ${dataURIs.length} user input image(s) berhasil dikonversi`);
      const payload = {
        idSimilary: idSimilary,
        generationMethod: generationMethod,
        prompt: prompt,
        seed: seed,
        userInputImages: dataURIs,
        generationMode: generationMode,
        templateImageUrl: templateImageUrl,
        platform: platform,
        packageName: packageName,
        gitVersion: gitVersion,
        outputImageWidth: outputImageWidth,
        outputImageHeight: outputImageHeight,
        ...rest
      };
      const result = await this.postRequest(this.config.endpoints.generatePortrait, payload);
      console.log("✅ Generate portrait berhasil");
      return result;
    } catch (error) {
      console.error("❌ Generate portrait gagal:", error.message);
      throw error;
    }
  }
  async enhance({
    imageUrl: image = [],
    scale = 1,
    face: faceEnhance = true,
    background: backgroundEnhance = true,
    fidelity = .5,
    color: colorEnhance = true,
    sharpness = 1,
    ...rest
  } = {}) {
    try {
      console.log("🌟 Memulai super enhance image...");
      const dataURIs = await convertImagesToDataURI(image);
      console.log(`✅ ${dataURIs.length} input image(s) berhasil dikonversi`);
      const payload = {
        scale: scale,
        faceEnhance: faceEnhance,
        backgroundEnhance: backgroundEnhance,
        fidelity: fidelity,
        userInputImages: dataURIs,
        colorEnhance: colorEnhance,
        sharpness: sharpness,
        ...rest
      };
      const result = await this.postRequest(this.config.endpoints.imageSuperEnhance, payload);
      console.log("✅ Super enhance image berhasil");
      return result;
    } catch (error) {
      console.error("❌ Super enhance image gagal:", error.message);
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
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new ApiClient();
  try {
    let response;
    switch (action) {
      case "portrait":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'prompt' dan 'imageUrl' wajib diisi untuk action 'portrait'."
          });
        }
        response = await api.portrait(params);
        break;
      case "enhance":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'enhance'."
          });
        }
        response = await api.enhance(params);
        break;
      case "prompter":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'prompter'."
          });
        }
        response = await api.prompter(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'prompter', 'portrait' dan 'enhance'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}