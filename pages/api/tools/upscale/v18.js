import axios from "axios";
import {
  FormData
} from "formdata-node";
import crypto from "crypto";
class PhotoGridAPI {
  constructor() {
    this.SALT = "Pg@photo_photogrid#20250225";
    this.APP_ID = "808645";
    this.PLATFORM = "h5";
    this.VERSION = "8.9.7";
    this.DEVICE_ID = this.getDid();
    this.GHOST_ID = null;
    this.USER_AGENT = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
    this.ACCEPT_LANGUAGE = "id-ID,id;q=0.9";
    this.MCC = "id-ID";
    this.cookies = new Map();
    this.axiosInstance = axios.create();
    this.setupInterceptors();
  }
  getDid() {
    return crypto.randomBytes(16).toString("hex");
  }
  getProcessedIp() {
    return {
      value: {
        data: crypto.randomBytes(10).toString("base64")
      }
    };
  }
  generateMd5(input) {
    return crypto.createHash("md5").update(input).digest("hex");
  }
  detectIncognito() {
    return false;
  }
  async getGhostIdForNode() {
    if (this.GHOST_ID) {
      return this.GHOST_ID;
    }
    const processedIp = this.getProcessedIp();
    const did = this.DEVICE_ID;
    const isIncognito = this.detectIncognito();
    if (isIncognito) {
      const ipData = processedIp?.value?.data || "";
      this.GHOST_ID = this.generateMd5(ipData);
    } else {
      const storedGhostId = this.cookies.get("ghostId");
      if (storedGhostId) {
        this.GHOST_ID = storedGhostId;
      } else {
        const ipData = processedIp?.value?.data || "";
        const newGhostId = this.generateMd5(did + ipData);
        this.cookies.set("ghostId", newGhostId);
        this.GHOST_ID = newGhostId;
      }
    }
    return this.GHOST_ID;
  }
  sha256(input) {
    return crypto.createHash("sha256").update(input).digest("hex");
  }
  async generateHashedString(params) {
    const prefix = "XX";
    const sortedKeys = Object.keys(params).sort();
    let concatenated = "";
    for (const key of sortedKeys) {
      concatenated += key + params[key];
    }
    try {
      const hash = await this.sha256(concatenated + this.SALT);
      return prefix + hash;
    } catch {
      return prefix + this.generateMd5(concatenated + this.SALT);
    }
  }
  getDefaultHeader() {
    return {
      "X-AppID": this.APP_ID,
      "X-Platform": this.PLATFORM,
      "X-Version": this.VERSION,
      "X-SessionToken": this.cookies.get("t") || "",
      "X-UniqueID": this.cookies.get("u") || "",
      "X-DeviceID": this.DEVICE_ID,
      "X-MCC": this.MCC
    };
  }
  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(config => {
      if (this.cookies.size > 0) {
        const cookieString = Array.from(this.cookies.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
        config.headers["Cookie"] = cookieString;
        console.log(`Attaching Cookie header: ${cookieString}`);
      }
      return config;
    }, error => Promise.reject(error));
    this.axiosInstance.interceptors.response.use(response => {
      const setCookieHeaders = response.headers["set-cookie"];
      if (setCookieHeaders) {
        console.log(`Found Set-Cookie headers:`, setCookieHeaders);
        setCookieHeaders.forEach(cookieStr => {
          const parts = cookieStr.split(";");
          const nameValue = parts[0];
          const [name, value] = nameValue.split("=");
          this.cookies.set(name, value);
          console.log(`Stored cookie: ${name}=${value}`);
        });
      }
      return response;
    }, error => Promise.reject(error));
  }
  async makeRequest(endpoint, data, method, contentType = "FORM") {
    console.log(`\n--- Requesting: ${endpoint} ---`);
    const baseUrl = "https://api.grid.plus";
    const url = baseUrl + endpoint;
    const defaultHeaders = this.getDefaultHeader();
    const ghostId = await this.getGhostIdForNode();
    const xHeadersForSig = Object.entries(defaultHeaders).filter(([key]) => key.startsWith("X-")).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: value
    }), {});
    let dataForSignature = {};
    let requestBody;
    let finalContentTypeHeader = "application/x-www-form-urlencoded";
    if (contentType === "MULTIPART") {
      const formData = new FormData();
      if (data) {
        for (const key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            if (value instanceof Buffer) {
              formData.append(key, value, `${key}.jpeg`);
            } else if (typeof value === "object" && value !== null) {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, String(value));
            }
          }
        }
      }
      requestBody = formData;
      finalContentTypeHeader = "multipart/form-data";
      dataForSignature = Object.entries(data || {}).filter(([, value]) => !(value instanceof Buffer)).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: value
      }), {});
    } else if (contentType === "JSON") {
      requestBody = JSON.stringify(data);
      finalContentTypeHeader = "application/json";
      dataForSignature = data || {};
    } else {
      requestBody = data ? new URLSearchParams(data).toString() : null;
      dataForSignature = data || {};
      finalContentTypeHeader = "application/x-www-form-urlencoded";
    }
    const sigParams = {
      ...xHeadersForSig,
      "X-GhostID": ghostId,
      ...dataForSignature
    };
    const sig = await this.generateHashedString(sigParams);
    const headers = {
      ...defaultHeaders,
      sig: sig,
      "X-GhostID": ghostId,
      "Content-Type": finalContentTypeHeader
    };
    console.log(`URL: ${url}`);
    console.log("Request Headers:", headers);
    console.log("Body/Payload for signature:", dataForSignature);
    if (contentType === "MULTIPART") {
      console.log("Actual Body (FormData): [Binary/Multipart Data]");
    } else {
      console.log("Actual Body:", requestBody);
    }
    const config = {
      method: method,
      url: url,
      headers: headers,
      data: requestBody
    };
    try {
      const response = await this.axiosInstance.request(config);
      console.log(`Response Status: ${response.status}`);
      console.log("Response Data:", response.data);
      if (response.data.code !== 0) {
        throw new Error(`API Error: ${response.data.errmsg || "Unknown error"}`);
      }
      return response.data;
    } catch (error) {
      console.error(`Request to ${endpoint} failed:`, error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async getUploadUrl(imageUrl, method) {
    console.log(`Getting extension for: ${imageUrl}`);
    const imageHeadResponse = await axios.head(imageUrl);
    const contentType = imageHeadResponse.headers["content-type"];
    let ext = "jpeg";
    if (contentType) {
      const mimePart = contentType.split(";")[0];
      const parts = mimePart.split("/");
      if (parts.length === 2 && parts[0] === "image") {
        ext = parts[1];
      }
    }
    console.log(`Determined extension: ${ext}`);
    const data = {
      ext: ext,
      method: method
    };
    return this.makeRequest("/v1/ai/web/nologin/getuploadurl", data, "POST", "MULTIPART");
  }
  async uploadImageToS3(uploadUrl, imageUrl) {
    console.log("\n--- Step 2: Uploading Image to S3 ---");
    console.log(`Workspaceing image from: ${imageUrl}`);
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer"
    });
    const imageBuffer = Buffer.from(imageResponse.data);
    console.log(`Image fetched. Size: ${imageBuffer.length} bytes, Content-Type: ${imageResponse.headers["content-type"]}`);
    const headers = {
      "Content-Type": imageResponse.headers["content-type"]
    };
    console.log(`Uploading to S3 URL: ${uploadUrl}`);
    console.log("Request Headers for S3 PUT:", headers);
    const response = await axios.put(uploadUrl, imageBuffer, {
      headers: headers
    });
    console.log(`Response Status for S3 PUT: ${response.status}`);
    console.log("Response Data for S3 PUT:", response.data);
    return response.data;
  }
  async submitImageForSuperResolution(imgUrl, method) {
    const data = {
      url: imgUrl,
      method: method
    };
    return this.makeRequest("/v1/ai/web/super_resolution/nologinupload", data, "POST", "MULTIPART");
  }
  async pollTaskResult(taskId, interval = 3e3, timeout = 6e4) {
    const data = {
      task_ids: [taskId]
    };
    const startTime = Date.now();
    return new Promise(async (resolve, reject) => {
      const checkStatus = async () => {
        console.log(`Polling for task ID: ${taskId}. Elapsed time: ${Date.now() - startTime}ms`);
        try {
          const responseData = await this.makeRequest("/v1/ai/web/super_resolution/nologinbatchresult", data, "POST", "JSON");
          const taskData = responseData.data[0];
          if (taskData && taskData.status === 2) {
            console.log(`Task ${taskId} completed!`);
            resolve(taskData);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error(`Polling timed out for task_id: ${taskId}`));
          } else {
            console.log(`Task ${taskId} not yet completed (status: ${taskData?.status}). Retrying in ${interval / 1e3} seconds...`);
            setTimeout(checkStatus, interval);
          }
        } catch (error) {
          console.error("Error polling task result:", error);
          reject(error);
        }
      };
      checkStatus();
    });
  }
  async upscale({
    imageUrl
  }) {
    console.log("\n--- Starting Full Super Resolution Process ---");
    try {
      const getUploadUrlResponse = await this.getUploadUrl(imageUrl, "wn_superresolution");
      const {
        img_url: finalImgUrl,
        upload_url: s3UploadUrl
      } = getUploadUrlResponse.data;
      console.log(`Resolved finalImgUrl: ${finalImgUrl}`);
      console.log(`Resolved s3UploadUrl: ${s3UploadUrl}`);
      await this.uploadImageToS3(s3UploadUrl, imageUrl);
      console.log("Image uploaded to S3 successfully.");
      const submitResponse = await this.submitImageForSuperResolution(finalImgUrl, "wn_superresolution");
      const {
        task_id: taskId
      } = submitResponse;
      console.log(`Image submitted for super resolution, Task ID: ${taskId}`);
      const result = await this.pollTaskResult(taskId);
      console.log("Super Resolution process completed successfully.");
      console.log("Final Result Data:", result);
      return result;
    } catch (error) {
      console.error("Super Resolution process failed:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' is required"
    });
  }
  try {
    const upscaler = new PhotoGridAPI();
    const result = await upscaler.upscale(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}