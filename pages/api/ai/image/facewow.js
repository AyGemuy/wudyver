import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
const TEMPLATES = [{
  templateId: "4fe010c9-d24a-40ab-9db8-55b3ae2b7db1",
  toolName: "mini_cartoon"
}, {
  templateId: "b485f845-76ed-44b2-b1c5-1abd1e061259",
  toolName: "mini_anime"
}, {
  templateId: "40db44e3-16ca-4cb8-a314-cd56613c7db6",
  toolName: "mini_sketch"
}, {
  templateId: "864756a6-2068-49a0-9329-a9c110147b71",
  toolName: "mini_headshot"
}, {
  templateId: "864756a6-2068-49a0-9329-a9c110147b71",
  toolName: "mini_headshot"
}];
class FacewowClient {
  constructor() {
    this.baseURL = "https://api.facewow.ai";
    this.cfTokenURL = `https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`;
    this.cookies = new Map();
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }
  getTemplateByIndex(index) {
    if (index < 0 || index >= TEMPLATES.length) {
      throw new Error(`Template index ${index} tidak valid. Index valid: 0-${TEMPLATES.length - 1}`);
    }
    return TEMPLATES[index];
  }
  getAvailableTemplates() {
    return TEMPLATES.map((template, index) => ({
      index: index,
      templateId: template.templateId,
      toolName: template.toolName
    }));
  }
  createAxiosInstance() {
    const instance = axios.create({
      baseURL: this.baseURL,
      timeout: 6e4,
      headers: this.buildHeaders()
    });
    return instance;
  }
  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(config => {
      config.headers = {
        ...config.headers,
        ...this.buildHeaders()
      };
      console.log(`📡 Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    }, error => {
      console.error("❌ Request interceptor error:", error.message);
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.response.use(response => {
      this.interceptSetCookie(response);
      return response;
    }, error => {
      if (error.response) {
        this.interceptSetCookie(error.response);
      }
      console.error("❌ Response error:", error.message);
      return Promise.reject(error);
    });
  }
  interceptSetCookie(response) {
    const setCookieHeader = response.headers["set-cookie"];
    if (setCookieHeader && Array.isArray(setCookieHeader)) {
      setCookieHeader.forEach(cookie => {
        const [nameValue] = cookie.split(";");
        const [name, value] = nameValue.split("=");
        if (name && value) {
          this.cookies.set(name.trim(), value.trim());
          console.log(`🍪 Cookie captured: ${name.trim()}`);
        }
      });
    }
  }
  generateRandomCookie() {
    const randomId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const deviceId = `${randomId()}-${randomId().substring(0, 4)}-${randomId().substring(0, 3)}-${randomId().substring(0, 4)}-${randomId().substring(0, 12)}`;
    const sensorsData = {
      distinct_id: `${randomId().substring(0, 10)}-${randomId().substring(0, 5)}-${randomId().substring(0, 4)}-${randomId().substring(0, 3)}-${randomId().substring(0, 5)}`,
      first_id: "",
      props: {
        $latest_traffic_source_type: "直接流量",
        $latest_search_keyword: "未取得值_直接打开",
        $latest_referrer: ""
      },
      $device_id: deviceId
    };
    return `sajssdk_2015_cross_new_user=1; sensorsdata2015jssdkcross=${encodeURIComponent(JSON.stringify(sensorsData))}; locale=en_US; clientLocale=en_US;`;
  }
  buildCookieString() {
    const randomCookies = this.generateRandomCookie();
    const interceptedCookies = Array.from(this.cookies.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
    return interceptedCookies ? `${randomCookies} ${interceptedCookies}` : randomCookies;
  }
  buildHeaders(additionalHeaders = {}) {
    const baseHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      cookie: this.buildCookieString(),
      origin: "https://facewow.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://facewow.ai/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-app-id": "app-facewow-web",
      ...SpoofHead()
    };
    return {
      ...baseHeaders,
      ...additionalHeaders
    };
  }
  async getCFToken() {
    console.log("[1/6] 🚀 Memulai proses mendapatkan CF Token...");
    try {
      const params = {
        sitekey: "0x4AAAAAABCtZb03O3DdJ2zo",
        url: "https://facewow.ai/ai-filter/photo-to-anime/"
      };
      console.log("[1/6] 📡 Mengirim request CF Token...");
      const response = await axios.get(this.cfTokenURL, {
        params: params,
        headers: this.buildHeaders()
      });
      if (!response.data?.token) {
        throw new Error("Token tidak ditemukan dalam response");
      }
      console.log("[1/6] ✅ CF Token berhasil didapatkan");
      return response.data.token;
    } catch (error) {
      console.error("[1/6] ❌ Gagal mendapatkan CF Token:", error.message);
      throw new Error(`CF Token error: ${error.message}`);
    }
  }
  async getSignedUrl() {
    console.log("[2/6] 🚀 Meminta signed URL...");
    try {
      const response = await this.axiosInstance.post("/v1/resource/sign/anime/jpg", null, {
        headers: this.buildHeaders({
          "content-length": "0"
        })
      });
      if (response.data?.code !== "000") {
        throw new Error(response.data?.msg || "Kode response tidak valid");
      }
      console.log("[2/6] ✅ Signed URL berhasil didapatkan");
      return response.data.data;
    } catch (error) {
      console.error("[2/6] ❌ Gagal mendapatkan signed URL:", error.message);
      throw new Error(`Signed URL error: ${error.message}`);
    }
  }
  async processImageInput(imageInput) {
    console.log("[3/6] 🖼️  Memproses input gambar...");
    try {
      if (!imageInput) throw new Error("Image input diperlukan");
      if (typeof imageInput === "string") {
        if (imageInput.startsWith("http")) {
          console.log("[3/6] 📥 Mengunduh gambar dari URL...");
          const response = await axios.get(imageInput, {
            responseType: "arraybuffer",
            timeout: 3e4,
            headers: this.buildHeaders()
          });
          console.log("[3/6] ✅ Gambar berhasil diunduh");
          return {
            buffer: Buffer.from(response.data),
            filename: "image.jpg"
          };
        }
        if (imageInput.startsWith("data:image")) {
          console.log("[3/6] 🔄 Decoding base64 image...");
          const matches = imageInput.match(/^data:image\/(\w+);base64,(.+)$/);
          if (!matches) throw new Error("Format base64 tidak valid");
          const buffer = Buffer.from(matches[2], "base64");
          console.log("[3/6] ✅ Base64 berhasil diproses");
          return {
            buffer: buffer,
            filename: `image.${matches[1]}`
          };
        }
      }
      if (Buffer.isBuffer(imageInput)) {
        console.log("[3/6] ✅ Buffer gambar siap digunakan");
        return {
          buffer: imageInput,
          filename: "image.jpg"
        };
      }
      throw new Error("Format image input tidak didukung");
    } catch (error) {
      console.error("[3/6] ❌ Gagal memproses gambar:", error.message);
      throw new Error(`Process image error: ${error.message}`);
    }
  }
  async uploadImageToS3(uploadUrl, imageBuffer) {
    console.log("[4/6] ☁️  Mengupload gambar ke S3...");
    try {
      await axios.put(uploadUrl, imageBuffer, {
        headers: this.buildHeaders({
          "Content-Type": "image/jpeg"
        }),
        timeout: 6e4
      });
      console.log("[4/6] ✅ Upload ke S3 berhasil");
    } catch (error) {
      console.error("[4/6] ❌ Gagal upload ke S3:", error.message);
      throw new Error(`S3 upload error: ${error.message}`);
    }
  }
  async generateAvatar(userResourceUrl, templateId, toolName) {
    console.log("[5/6] 🎨 Memulai generate avatar...");
    try {
      const cfToken = await this.getCFToken();
      const payload = {
        toolName: toolName,
        templateId: templateId,
        userResourceUrl: userResourceUrl
      };
      console.log("[5/6] 📡 Mengirim request generate...");
      const response = await this.axiosInstance.post("/v1/generate/avatar", payload, {
        headers: this.buildHeaders({
          "Content-Type": "application/json;charset=utf-8",
          "cf-turnstile-token": cfToken
        })
      });
      if (!response.data?.data?.taskId) {
        throw new Error("Task ID tidak ditemukan dalam response");
      }
      console.log("[5/6] ✅ Generate process started, Task ID:", response.data.data.taskId);
      return response.data;
    } catch (error) {
      console.error("[5/6] ❌ Gagal memulai generate:", error.message);
      throw new Error(`Generate error: ${error.message}`);
    }
  }
  async checkTaskStatus(taskId) {
    console.log(`[Status] 🔍 Checking status task: ${taskId}`);
    try {
      const response = await this.axiosInstance.get(`/v1/tasks/avatar/${taskId}?taskId=${taskId}`);
      console.log(`[Status] 📊 Status task ${taskId}: ${response.data?.data?.status}`);
      return response.data;
    } catch (error) {
      console.error("[Status] ❌ Gagal memeriksa status:", error.message);
      throw new Error(`Status check error: ${error.message}`);
    }
  }
  async generate({
    imageUrl,
    filter = 1
  }) {
    console.log("🌈 ===== MEMULAI PROSES GENERATE AVATAR =====");
    try {
      const template = this.getTemplateByIndex(filter);
      console.log(`🎨 Menggunakan template: ${template.toolName} (Index: ${filter})`);
      const imageData = await this.processImageInput(imageUrl);
      const signedUrlData = await this.getSignedUrl();
      await this.uploadImageToS3(signedUrlData.upload_url, imageData.buffer);
      const generateResult = await this.generateAvatar(signedUrlData.url, template.templateId, template.toolName);
      console.log("🎉 ===== PROSES GENERATE SELESAI =====");
      return {
        success: true,
        taskId: generateResult.data?.taskId,
        template: template,
        message: "Generate process started successfully"
      };
    } catch (error) {
      console.error("💥 ===== PROSES GENERATE GAGAL =====");
      console.error("Error:", error.message);
      return {
        success: false,
        error: error.message,
        message: "Generate process failed"
      };
    }
  }
  async status({
    task_id
  }) {
    console.log("🔍 ===== CEK STATUS TASK =====");
    try {
      const statusResult = await this.checkTaskStatus(task_id);
      const result = {
        success: true,
        status: statusResult.data?.status,
        completed: statusResult.data?.status === "completed",
        result: statusResult.data,
        message: "Status retrieved successfully"
      };
      console.log("✅ ===== STATUS DICEK =====");
      console.log("Status:", result.status);
      console.log("Completed:", result.completed);
      return result;
    } catch (error) {
      console.error("❌ ===== GAGAL CEK STATUS =====");
      console.error("Error:", error.message);
      return {
        success: false,
        error: error.message,
        message: "Failed to get status"
      };
    }
  }
  clearCookies() {
    this.cookies.clear();
    console.log("🧹 All intercepted cookies cleared");
  }
  getCookies() {
    return Object.fromEntries(this.cookies);
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action is required."
    });
  }
  const client = new FacewowClient();
  try {
    let response;
    switch (action) {
      case "create":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "imageUrl is required for create."
          });
        }
        const create_task = await client.generate({
          imageUrl: params.imageUrl,
          filter: parseInt(params.filter) || 1
        });
        return res.status(200).json(create_task);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await client.status(params);
        return res.status(200).json(response);
      case "templates":
        const templates = client.getAvailableTemplates();
        return res.status(200).json({
          success: true,
          templates: templates,
          message: "Available templates retrieved successfully"
        });
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'create', 'status', and 'templates'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}