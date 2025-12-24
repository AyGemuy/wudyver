import axios from "axios";
import {
  randomUUID
} from "crypto";
const Req = {
  SilentLogin: d => ({
    deviceId: d
  }),
  PresignedUrl: fName => ({
    fileName: fName
  }),
  GenerateImage: ({
    id: dId,
    ...rest
  }) => ({
    documentId: dId,
    input: {
      ...rest
    }
  })
};
class AperoApi {
  constructor() {
    this.accessToken = null;
    this.loginPromise = null;
    this.config = {
      BUNDLE_ID: "tera.aiartgenerator.aiphoto.aiphotoenhancer",
      DEVICE_ID: randomUUID(),
      ACCOUNT_BASE_URL: "https://llm-account-service.aperogroup.ai",
      AI_BASE_URL: "https://api-metart.aperogroup.ai",
      ENDPOINTS: {
        SILENT_LOGIN: "/saas-user-service/v1/users/silent-login",
        GET_CATEGORIES: "/api/v1/strapi/categories",
        GET_CATEGORY_TEMPLATES: "/api/v1/strapi/categories/{categoryId}/templates",
        PRESIGNED_URL: "/api/ai-generation/presigned-url",
        GENERATE_IMAGE: "/api/ai-generation/image"
      }
    };
    this.baseHeaders = {
      "x-api-bundleId": this.config.BUNDLE_ID,
      "Content-Type": "application/json"
    };
    console.log(`[INIT] Device ID baru: ${this.config.DEVICE_ID}`);
    this.loginPromise = this._performSilentLogin();
  }
  async _performSilentLogin() {
    console.log("1. Melakukan Silent Login (otomatis dari constructor)...");
    try {
      const url = this.config.ACCOUNT_BASE_URL + this.config.ENDPOINTS.SILENT_LOGIN;
      const {
        data
      } = await axios.post(url, Req.SilentLogin(this.config.DEVICE_ID), {
        headers: this.baseHeaders
      });
      console.log("\n   >>> RESPON DATA ASLI (Login):");
      console.log(JSON.stringify(data, null, 2));
      const accessToken = data.data?.accessToken;
      if (!accessToken) throw new Error("Token tidak ditemukan dalam respons.");
      this.accessToken = accessToken;
      console.log(`\n   -> OK. Token diperoleh dan disimpan.`);
      return accessToken;
    } catch (e) {
      console.error("\n--- LOGIN GAGAL KRITIS ---");
      console.error(`[Login GAGAL] Status: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
      throw e;
    }
  }
  async ensureLogin() {
    if (!this.loginPromise) {
      throw new Error("AperoApi tidak diinisialisasi dengan benar.");
    }
    await this.loginPromise;
    return {
      ...this.baseHeaders,
      Authorization: `Bearer ${this.accessToken}`
    };
  }
  async processFileInput(fileInput) {
    if (Buffer.isBuffer(fileInput)) {
      return fileInput;
    }
    if (typeof fileInput === "string") {
      if (fileInput.startsWith("http")) {
        console.log(`   -> Downloading file from URL: ${fileInput}`);
        const response = await axios.get(fileInput, {
          responseType: "arraybuffer"
        });
        return Buffer.from(response.data);
      } else if (fileInput.startsWith("data:")) {
        console.log(`   -> Processing base64 data`);
        const base64Data = fileInput.split(",")[1];
        return Buffer.from(base64Data, "base64");
      } else if (fileInput.length > 100) {
        console.log(`   -> Processing plain base64 data`);
        return Buffer.from(fileInput, "base64");
      }
    }
    throw new Error("Unsupported file input type. Support: Buffer, URL, Base64");
  }
  async autoPresignAndUpload(fileInput, fileName = `user-uploads/input_${randomUUID()}.png`) {
    console.log(`\n4. Auto Presign & Upload untuk: ${fileName}`);
    const presignedData = await this.presigned({
      fileName: fileName
    });
    const {
      presignedUrl,
      objectKey
    } = presignedData;
    const fileBuffer = await this.processFileInput(fileInput);
    console.log(`   -> Uploading file (${fileBuffer.length} bytes) to presigned URL`);
    await axios.put(presignedUrl, fileBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": fileBuffer.length
      }
    });
    console.log(`   -> Upload successful! Object Key: ${objectKey}`);
    return {
      presignedUrl: presignedUrl,
      objectKey: objectKey,
      fileSize: fileBuffer.length
    };
  }
  async categories() {
    console.log("\n2. Mendapatkan Kategori...");
    const authHeaders = await this.ensureLogin();
    try {
      const url = this.config.AI_BASE_URL + this.config.ENDPOINTS.GET_CATEGORIES;
      const {
        data
      } = await axios.get(url, {
        headers: authHeaders,
        params: {
          page: 1,
          limit: 10
        }
      });
      console.log("\n   >>> RESPON DATA ASLI (Kategori):");
      console.log(JSON.stringify(data, null, 2));
      console.log(`\n   -> OK. Total kategori ditemukan: ${data.data?.length || 0}`);
      return data?.data || data;
    } catch (e) {
      throw new Error(`[Get Categories GAGAL] Status: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }
  }
  async templates({
    id: categoryId
  }) {
    console.log(`\n3. Mendapatkan Template untuk Category ID: ${categoryId}...`);
    const authHeaders = await this.ensureLogin();
    try {
      let url = this.config.AI_BASE_URL + this.config.ENDPOINTS.GET_CATEGORY_TEMPLATES;
      url = url.replace("{categoryId}", categoryId);
      const {
        data
      } = await axios.get(url, {
        headers: authHeaders
      });
      console.log("\n   >>> RESPON DATA ASLI (Template):");
      console.log(JSON.stringify(data, null, 2));
      console.log(`\n   -> OK. Total template ditemukan: ${data.data?.length || 0}`);
      return data?.data || data;
    } catch (e) {
      throw new Error(`[Get Templates GAGAL] Status: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }
  }
  async presigned({
    fileName = `user-uploads/input_${randomUUID()}.png`
  }) {
    console.log("\n4. Meminta Presigned URL (Persiapan Upload)...");
    const authHeaders = await this.ensureLogin();
    try {
      const url = this.config.AI_BASE_URL + this.config.ENDPOINTS.PRESIGNED_URL;
      const reqBody = Req.PresignedUrl(fileName);
      const {
        data
      } = await axios.post(url, reqBody, {
        headers: authHeaders
      });
      console.log("\n   >>> RESPON DATA ASLI (Presigned URL):");
      console.log(JSON.stringify(data, null, 2));
      console.log(`\n   -> OK. URL Presigned diperoleh untuk ${fileName}.`);
      return data?.data || data;
    } catch (e) {
      throw new Error(`[Presigned URL GAGAL] Status: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }
  }
  async generate({
    id: documentId,
    files,
    ...rest
  }) {
    console.log("\n5. Meminta Generate Image...");
    const authHeaders = await this.ensureLogin();
    try {
      const url = this.config.AI_BASE_URL + this.config.ENDPOINTS.GENERATE_IMAGE;
      let processedInput = {
        ...rest
      };
      if (files) {
        console.log(`   -> Processing ${Array.isArray(files) ? files.length : 1} file(s)`);
        if (Array.isArray(files)) {
          const uploadResults = [];
          let index = 0;
          for (const file of files) {
            console.log(`   -> Processing file ${index + 1} of ${files.length}`);
            const uploadResult = await this.autoPresignAndUpload(file, `user-uploads/input_${randomUUID()}_${index}.png`);
            uploadResults.push(uploadResult);
            index++;
          }
          processedInput.files = uploadResults.map(result => result.objectKey);
        } else {
          const uploadResult = await this.autoPresignAndUpload(files);
          processedInput.files = uploadResult.objectKey;
        }
      }
      const reqBody = Req.GenerateImage({
        id: documentId,
        ...processedInput
      });
      console.log("\n   >>> REQUEST BODY (Generate Image):");
      console.log(JSON.stringify(reqBody, null, 2));
      const {
        data
      } = await axios.post(url, reqBody, {
        headers: authHeaders
      });
      console.log("\n   >>> RESPON DATA ASLI (Generate Image):");
      console.log(JSON.stringify(data, null, 2));
      console.log("\n   -> OK. Permintaan Terkirim.");
      return data?.data || data;
    } catch (e) {
      throw new Error(`[Generate GAGAL] Status: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
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
  const api = new AperoApi();
  try {
    let response;
    switch (action) {
      case "categories":
        response = await api.categories();
        break;
      case "templates":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi untuk action 'templates'."
          });
        }
        response = await api.templates(params);
        break;
      case "generate":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'categories', 'templates' dan 'generate'.`
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