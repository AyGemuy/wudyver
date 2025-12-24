import axios from "axios";
import https from "https";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class LightPdf {
  constructor() {
    this.agent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true
    });
    this.commonData = {
      cli_os: "web",
      product_id: "227",
      language: "en"
    };
    this.headers = {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      origin: "https://lightpdf.com",
      referer: "https://lightpdf.com/image-watermark-remover",
      "accept-language": "id-ID",
      ...SpoofHead()
    };
  }
  log(msg, type = "info") {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${type.toUpperCase()}] ${msg}`);
  }
  async getBuf(source) {
    try {
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string") {
        if (source.startsWith("http")) {
          this.log("Fetching image from URL...");
          const res = await axios.get(source, {
            responseType: "arraybuffer",
            httpsAgent: this.agent
          });
          return Buffer.from(res.data);
        }
        const base64 = source.includes("base64") ? source.split(",").pop() : source;
        return Buffer.from(base64, "base64");
      }
      throw new Error("Invalid source type");
    } catch (e) {
      throw new Error(`Buffer conversion failed: ${e.message}`);
    }
  }
  async req(url, method, data = null, params = {}, headers = {}) {
    try {
      const config = {
        method: method,
        url: url,
        httpsAgent: this.agent,
        headers: {
          ...this.headers,
          ...headers
        },
        data: data,
        params: params
      };
      const resp = await axios(config);
      return resp.data;
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      if (!url.includes("tasks") || e.response?.status !== 404) {
        this.log(`Req Error: ${msg} (${e.response?.status || 0})`, "error");
      }
      throw e;
    }
  }
  signOss(method, bucket, objectKey, headers, secret) {
    const date = headers["x-oss-date"];
    const contentType = headers["Content-Type"] || "";
    const contentMd5 = "";
    const ossHeaders = Object.keys(headers).filter(k => k.startsWith("x-oss-")).sort().map(k => `${k.toLowerCase()}:${headers[k]}`).join("\n");
    const resource = `/${bucket}/${objectKey}`;
    const stringToSign = `${method}\n${contentMd5}\n${contentType}\n${date}\n${ossHeaders}\n${resource}`;
    const signature = crypto.createHmac("sha1", secret).update(stringToSign).digest("base64");
    return signature;
  }
  async login() {
    this.log("Authenticating...");
    const url = "https://gw.aoscdn.com/base/passport/v2/login/anonymous";
    const payload = {
      device_hash: crypto.randomBytes(16).toString("hex"),
      os_name: "android",
      os_version: "1.0",
      ...this.commonData
    };
    const res = await this.req(url, "POST", payload, {}, {
      "content-type": "application/json"
    });
    const token = res?.data?.api_token || res?.data?.token;
    if (!token) throw new Error("No token in response");
    return token;
  }
  async conf(token, filename) {
    this.log("Getting OSS Config...");
    const url = "https://gw.aoscdn.com/app/lightpdf/v2/authorizations/oss";
    const data = {
      "filenames[]": filename
    };
    const res = await this.req(url, "POST", data, {}, {
      authorization: `Bearer ${token}`,
      "content-type": "multipart/form-data"
    });
    if (res?.data) return res.data;
    throw new Error("Failed OSS Config");
  }
  async up(buffer, ossData, filename) {
    this.log(`Uploading to OSS (Manual)...`);
    const {
      credential,
      bucket,
      endpoint,
      objects,
      callback
    } = ossData;
    const objectKey = objects[filename];
    const host = `https://${bucket}.${endpoint}`;
    const url = `${host}/${objectKey}`;
    const date = new Date().toUTCString();
    const contentType = "image/jpeg";
    const callbackJson = JSON.stringify({
      callbackUrl: callback.url,
      callbackBody: callback.body,
      callbackBodyType: callback.type || "application/x-www-form-urlencoded"
    });
    const callbackBase64 = Buffer.from(callbackJson).toString("base64");
    const ossHeaders = {
      "x-oss-callback": callbackBase64,
      "x-oss-date": date,
      "x-oss-security-token": credential.security_token,
      "x-oss-user-agent": "aliyun-sdk-js/6.9.0 Chrome 127.0.0.0"
    };
    const signature = this.signOss("PUT", bucket, objectKey, {
      "Content-Type": contentType,
      ...ossHeaders
    }, credential.access_key_secret);
    const putHeaders = {
      Accept: "*/*",
      "Cache-Control": "no-cache",
      "Content-Type": contentType,
      Date: date,
      Authorization: `OSS ${credential.access_key_id}:${signature}`,
      ...ossHeaders
    };
    try {
      const res = await axios.put(url, buffer, {
        headers: putHeaders,
        httpsAgent: this.agent
      });
      const data = res.data;
      let resourceId = data?.data?.resource_id || data?.resource_id;
      if (!resourceId) {
        console.error("Callback Response:", data);
        throw new Error("Upload OK but Resource ID missing in callback");
      }
      this.log(`Upload success, Resource ID: ${resourceId}`);
      return {
        resourceId: resourceId
      };
    } catch (e) {
      this.log(`OSS Manual Upload Error: ${e.message}`, "error");
      if (e.response) {
        this.log(`OSS Response: ${JSON.stringify(e.response.data)}`, "error");
      }
      throw e;
    }
  }
  async run(token, resourceId, mode = "wm") {
    this.log(`Creating Task (${mode})...`);
    let url;
    let payload = {
      resource_id: resourceId,
      ...this.commonData
    };
    if (mode === "deep") {
      url = "https://gw.aoscdn.com/app/lightpdf/v2/tasks/deep-removal";
      payload.type = 94;
    } else {
      url = "https://gw.aoscdn.com/app/lightpdf/v2/tasks/external/watermark";
      payload.type = 94;
    }
    const res = await this.req(url, "POST", payload, {}, {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    });
    if (res?.data?.task_id) return res.data.task_id;
    throw new Error("Task Creation Failed");
  }
  async check(token, taskId, mode) {
    let baseUrl;
    if (mode === "deep") {
      baseUrl = `https://gw.aoscdn.com/app/lightpdf/v2/tasks/deep-removal/${taskId}`;
    } else {
      baseUrl = `https://gw.aoscdn.com/app/lightpdf/v2/tasks/external/watermark/${taskId}`;
    }
    this.log(`Polling Task: ${taskId}`);
    for (let i = 0; i < 60; i++) {
      const res = await this.req(baseUrl, "GET", null, this.commonData, {
        authorization: `Bearer ${token}`
      });
      const data = res?.data;
      const state = data?.state;
      if (state === 1) {
        this.log("Task Completed!");
        return data;
      } else if (state < 0) {
        throw new Error(`Task Failed (State: ${state})`);
      }
      await new Promise(r => setTimeout(r, 3e3));
    }
    throw new Error("Polling Timeout");
  }
  async generate({
    imageUrl,
    mode = "wm",
    ...rest
  }) {
    try {
      const startT = Date.now();
      const ext = "jpg";
      const filename = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
      const buffer = await this.getBuf(imageUrl);
      const token = await this.login();
      const ossConf = await this.conf(token, filename);
      const {
        resourceId
      } = await this.up(buffer, ossConf, filename);
      const taskId = await this.run(token, resourceId, mode);
      const finalData = await this.check(token, taskId, mode);
      return {
        result: finalData?.file,
        originalName: finalData?.file_name,
        taskId: taskId,
        processTime: `${((Date.now() - startT) / 1e3).toFixed(2)}s`,
        ...rest
      };
    } catch (e) {
      this.log(e.message, "error");
      return {
        result: null,
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new LightPdf();
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