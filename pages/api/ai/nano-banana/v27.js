import axios from "axios";
import crypto from "crypto";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
  "sec-ch-ua-platform": '"Android"',
  authorization: "null",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  dnt: "1",
  "content-type": "application/json",
  "sec-fetch-site": "same-origin",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  referer: "https://supawork.ai/id/nano-banana",
  "accept-language": "id-ID,id;q=0.9,en;q=0.8",
  priority: "u=1, i"
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const buildCookieHeader = jar => {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
};
class Supawork {
  constructor() {
    this.baseUrl = "https://supawork.ai";
    this.cookieJar = {
      i18n_redirected: "id"
    };
    this.axios = axios.create({
      headers: COMMON_HEADERS,
      timeout: 3e4
    });
    this.axios.interceptors.response.use(res => {
      const setCookie = res.headers["set-cookie"];
      if (setCookie) {
        for (const cookie of setCookie) {
          const [full] = cookie.split(";");
          const [k, v] = full.split("=").map(s => s.trim());
          if (k && v) this.cookieJar[k] = v;
        }
      }
      return res;
    });
    console.log("Supawork initialized with cookie jar");
  }
  getHeaders(extra = {}) {
    return {
      ...COMMON_HEADERS,
      cookie: buildCookieHeader(this.cookieJar),
      ...extra
    };
  }
  async getPresignedUrl() {
    const url = `${this.baseUrl}/supawork/headshot/api/sys/oss/token?f_suffix=png&get_num=1&unsafe=1`;
    const res = await this.axios.get(url, {
      headers: this.getHeaders()
    });
    const data = res.data?.data?.[0];
    if (data?.put && data?.get) {
      return {
        put: data.put,
        get: data.get
      };
    }
    throw new Error("Failed to get presigned URL");
  }
  async getImageBuffer(source) {
    if (Buffer.isBuffer(source)) return source;
    if (source.startsWith("http")) {
      const res = await axios.get(source, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      return Buffer.from(res.data);
    }
    if (source.startsWith("data:")) {
      const b64 = source.split(",")[1];
      return Buffer.from(b64, "base64");
    }
    throw new Error(`Invalid image source: ${source}`);
  }
  async uploadSingleImage(buffer, presigned) {
    try {
      await axios.put(presigned.put, buffer, {
        headers: {
          "Content-Type": "image/png",
          "Content-Length": buffer.length.toString(),
          Origin: "https://supawork.ai",
          Referer: "https://supawork.ai/",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          Accept: "*/*",
          "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site"
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 3e4
      });
      console.log(`Uploaded: ${presigned.get}`);
      return presigned.get;
    } catch (err) {
      console.error(`Upload failed: ${presigned.put}`, err.message);
      if (err.response) {
        console.error("Response status:", err.response.status);
        console.error("Response data:", err.response.data);
      }
      return null;
    }
  }
  async uploadImages(imageSources) {
    const uploaded = [];
    for (const src of imageSources) {
      try {
        console.log(`Processing image: ${src.substring(0, 50)}...`);
        const buffer = await this.getImageBuffer(src);
        console.log(`Image size: ${buffer.length} bytes`);
        const presigned = await this.getPresignedUrl();
        console.log(`Got presigned URL: ${presigned.put.substring(0, 50)}...`);
        const getUrl = await this.uploadSingleImage(buffer, presigned);
        if (getUrl) {
          uploaded.push(getUrl);
          console.log(`Successfully uploaded: ${getUrl}`);
        }
        await delay(1e3);
      } catch (err) {
        console.error("Upload error:", err.message);
      }
    }
    return uploaded;
  }
  async createTask({
    prompt,
    imageUrls = [],
    numResults = 1
  }) {
    const identityId = crypto.randomUUID();
    const payload = {
      identity_id: identityId,
      aigc_app_code: imageUrls.length > 0 ? "image_to_image_generator" : "text_to_image_generator",
      model_code: "google_nano_banana",
      custom_prompt: prompt,
      aspect_ratio: imageUrls.length > 0 ? "match_input_image" : "1:1",
      image_urls: imageUrls,
      currency_type: "silver"
    };
    console.log("Creating task with payload:", JSON.stringify(payload, null, 2));
    const res = await this.axios.post(`${this.baseUrl}/supawork/headshot/api/media/image/generator`, payload, {
      headers: this.getHeaders({
        origin: this.baseUrl,
        referer: `${this.baseUrl}/id/nano-banana`
      })
    });
    console.log("Task creation response:", res.data);
    if (res.data?.code === 1e5) {
      return {
        identityId: identityId,
        creationId: res.data.data.creation_id
      };
    }
    throw new Error(res.data?.message || `Task failed: ${JSON.stringify(res.data)}`);
  }
  async pollTask(identityId, maxAttempts = 80, interval = 3e3) {
    for (let i = 1; i <= maxAttempts; i++) {
      console.log(`Polling ${i}/${maxAttempts}...`);
      try {
        const res = await this.axios.get(`${this.baseUrl}/supawork/headshot/api/media/aigc/result/list/v1?page_no=1&page_size=10&identity_id=${identityId}`, {
          headers: this.getHeaders()
        });
        const task = res.data?.data?.list?.[0];
        const subTasks = task?.list || [];
        const results = subTasks.filter(t => t.status === 1 && t.url?.[0]).map(t => t.url[0]);
        if (results.length > 0) {
          console.log(`Success: ${results.length} image(s) generated`);
          return results;
        }
        if (task?.status === 2 || subTasks.some(t => t.status === 2)) {
          throw new Error("Generation failed");
        }
        await delay(interval);
      } catch (err) {
        if (i === maxAttempts) throw err;
        await delay(interval);
      }
    }
    throw new Error("Timeout: No result");
  }
  async generate({
    prompt,
    imageUrl,
    numResults = 1
  }) {
    const imageUrls = Array.isArray(imageUrl) ? imageUrl.slice(0, 10) : imageUrl ? [imageUrl] : [];
    const totalNeeded = imageUrls.length || numResults;
    if (totalNeeded > 10) throw new Error("Max 10 images/variations");
    console.log(`Generate: "${prompt}"`);
    console.log(`Input images: ${imageUrls.length}`);
    console.log(`Results requested: ${numResults}`);
    try {
      let uploadedUrls = [];
      if (imageUrls.length > 0) {
        console.log("Uploading input images...");
        uploadedUrls = await this.uploadImages(imageUrls);
        if (uploadedUrls.length === 0) throw new Error("All uploads failed");
        console.log(`Successfully uploaded ${uploadedUrls.length} images`);
      }
      console.log("Creating generation task...");
      const {
        identityId
      } = await this.createTask({
        prompt: prompt,
        imageUrls: uploadedUrls,
        numResults: numResults
      });
      console.log("Polling for results...");
      const results = await this.pollTask(identityId);
      return {
        success: true,
        result: results,
        count: results.length,
        mode: uploadedUrls.length > 0 ? "image_to_image" : "text_to_image"
      };
    } catch (error) {
      console.error("Generation error:", error);
      return {
        success: false,
        error: error.message,
        mode: imageUrls.length > 0 ? "image_to_image" : "text_to_image"
      };
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
  const api = new Supawork();
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