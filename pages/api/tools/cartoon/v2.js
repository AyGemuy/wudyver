import axios from "axios";
class AirbrushService {
  constructor() {
    this.headers = {};
    this.instance = axios.create({
      baseURL: "https://airbrush.com",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "id-ID,id;q=0.9",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
    this.instance.interceptors.response.use(response => {
      const setCookie = response.headers["set-cookie"];
      if (setCookie) {
        this.headers["set-cookie"] = setCookie;
        this.instance.defaults.headers.common["cookie"] = this.headers["set-cookie"].join("; ");
      }
      return response;
    }, error => {
      if (error.response && error.response.data && error.response.data.includes && error.response.data.includes("<Code>MissingRequiredHeader</Code>")) {
        console.error("Error: Missing required header (x-ms-blob-type).  Retrying with image/jpeg.");
        return Promise.reject(error);
      }
      return Promise.reject(error);
    });
  }
  generateAnonymousUid() {
    const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return `ab-${randomString.substring(0, 32)}`;
  }
  generateSentryTrace() {
    const hex = n => n.toString(16).padStart(2, "0");
    const randomBytes = Array.from({
      length: 16
    }, () => Math.floor(Math.random() * 256));
    const traceIdBytes = randomBytes.slice(0, 16);
    const spanIdBytes = randomBytes.slice(0, 8);
    const traceId = Array.from(traceIdBytes).map(hex).join("");
    const spanId = Array.from(spanIdBytes).map(hex).join("");
    return `${traceId}-${spanId}-0`;
  }
  async getCsrfToken() {
    try {
      const response = await this.instance.post("/core-api/v1/csrf/token", {}, {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9",
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      console.log("CSRF Token Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Gagal mendapatkan CSRF token:", error);
      throw error;
    }
  }
  async getCartoonPage() {
    try {
      const response = await this.instance.get("/photo-to-cartoon");
      return response.data;
    } catch (error) {
      console.error("Gagal mengambil halaman cartoon:", error);
      throw error;
    }
  }
  async requestUploadUrl(mimeType = "image/jpeg") {
    try {
      const csrfData = await this.getCsrfToken();
      const csrfToken = csrfData;
      const sentryTrace = this.generateSentryTrace();
      const response = await this.instance.get(`/core-api/v1/upload/sas?mimetype=${encodeURIComponent(mimeType)}`, {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9",
          referer: "https://airbrush.com/photo-to-cartoon",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "x-anonymous-uid": this.generateAnonymousUid(),
          "x-csrf-token": csrfToken,
          "x-tenant": "ab",
          baggage: `sentry-environment=production,sentry-release=lye2GcirR3MXm3BMjNqPw,sentry-public_key=abcd491e990f6b7131e31a895634fd74,sentry-trace_id=${sentryTrace},sentry-sample_rate=0.1,sentry-transaction=%2Fphoto-to-cartoon,sentry-sampled=false`,
          "sentry-trace": sentryTrace,
          cookie: this.instance.defaults.headers.common["cookie"]
        }
      });
      return response.data;
    } catch (error) {
      console.error("Gagal mendapatkan URL upload:", error);
      throw error;
    }
  }
  async uploadImage(uploadUrl, imageFile, mimeType) {
    try {
      await axios.put(uploadUrl, imageFile, {
        headers: {
          "Content-Type": mimeType,
          "x-ms-blob-type": "BlockBlob"
        }
      });
    } catch (error) {
      console.error("Gagal mengupload gambar:", error);
      throw error;
    }
  }
  async getImageFileFromUrl(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = response.headers["content-type"] || "image/jpg";
      return {
        data: response.data,
        type: contentType
      };
    } catch (error) {
      console.error("Gagal mendapatkan file gambar dari URL:", error);
      throw error;
    }
  }
  async createCartoon({
    imageUrl
  }) {
    try {
      const imageFile = await this.getImageFileFromUrl(imageUrl);
      const uploadResponse = await this.requestUploadUrl(imageFile.type);
      const {
        uploadUrl,
        accessUrl
      } = uploadResponse;
      await this.uploadImage(uploadUrl, imageFile.data, imageFile.type);
      const csrfData = await this.getCsrfToken();
      const csrfToken = csrfData;
      const anonymousUid = this.generateAnonymousUid();
      const sentryTrace = this.generateSentryTrace();
      const response = await this.instance.post("/core-api/v1/cartoon/create", {
        styleName: "cartoon",
        source: accessUrl
      }, {
        headers: {
          ...this.instance.defaults.headers.common,
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          origin: "https://airbrush.com",
          referer: "https://airbrush.com/photo-to-cartoon/result?rp=pa41knfu",
          "x-anonymous-uid": anonymousUid,
          "x-csrf-token": csrfToken,
          "x-tenant": "ab",
          baggage: `sentry-environment=production,sentry-release=lye2GcirR3MXm3BMjNqPw,sentry-public_key=abcd491e990f6b7131e31a895634fd74,sentry-trace_id=${sentryTrace},sentry-sample_rate=0.1,sentry-transaction=%2Fphoto-to-cartoon%2Fresult,sentry-sampled=false`,
          priority: "u=1, i",
          "sentry-trace": sentryTrace,
          cookie: this.instance.defaults.headers.common["cookie"]
        }
      });
      if (response.data && response.data.taskId) {
        return await this.pollTask(response.data.taskId);
      }
      return response.data;
    } catch (error) {
      console.error("Gagal membuat cartoon:", error);
      throw error;
    }
  }
  async queryTask(taskId) {
    try {
      const csrfData = await this.getCsrfToken();
      const csrfToken = csrfData;
      const response = await this.instance.get(`/core-api/v1/cartoon/query/${taskId}`, {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9",
          referer: "https://airbrush.com/photo-to-cartoon/result?rp=res9n8v4",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "x-anonymous-uid": this.generateAnonymousUid(),
          "x-csrf-token": csrfToken,
          "x-tenant": "ab",
          baggage: `sentry-environment=production,sentry-release=lye2GcirR3MXm3BMjNqPw,sentry-public_key=abcd491e990f6b7131e31a895634fd74,sentry-trace_id=${this.generateSentryTrace()},sentry-sample_rate=0.1,sentry-transaction=%2Fphoto-to-cartoon%2Fresult,sentry-sampled=false`,
          "sentry-trace": this.generateSentryTrace(),
          cookie: this.instance.defaults.headers.common["cookie"]
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Gagal melakukan query task ${taskId}:`, error);
      throw error;
    }
  }
  async pollTask(taskId) {
    while (true) {
      try {
        const taskInfo = await this.queryTask(taskId);
        console.log("Status Task:", taskInfo.status);
        if (taskInfo.status === "success") {
          console.log("Task Selesai:", taskInfo);
          return taskInfo;
        } else if (taskInfo.status === "failed") {
          console.error("Task Gagal:", taskInfo);
          throw new Error(`Pembuatan kartun gagal. Task ID: ${taskId}`);
        }
        await new Promise(resolve => setTimeout(resolve, 3e3));
      } catch (error) {
        console.error("Error saat polling task:", error);
        throw error;
      }
    }
  }
  getCookies() {
    return this.headers["set-cookie"];
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const airbrushService = new AirbrushService();
  try {
    const data = await airbrushService.createCartoon(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}