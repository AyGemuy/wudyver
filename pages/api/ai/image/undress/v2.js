import axios from "axios";
import crypto from "crypto";
class LovePal {
  constructor() {
    this.baseUrl = "https://api.lovepal.net/v1";
    this.salt = "eac091c790ba144807037553a0517ff9";
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.token = null;
    this.uid = null;
    this.uploadedKey = null;
    this.baseHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      origin: "https://loveone.wiki",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": this.userAgent,
      "x-app-domain": "loveone.wiki",
      "x-app-id": "1",
      "x-app-timezone": "Asia/Makassar",
      "x-app-version": "0.3.27"
    };
  }
  log(msg, data) {
    const time = new Date().toLocaleTimeString("en-GB");
    console.log(`[${time}] ${msg}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }
  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  rand(len = 16) {
    const chars = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz123456789";
    let res = "";
    for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res;
  }
  md5(str) {
    return crypto.createHash("md5").update(str).digest("hex");
  }
  generateSign(path, params) {
    const timestamp = Math.floor(Date.now() / 1e3);
    const nonce = this.rand(16);
    const signObj = {
      ...params,
      timestamp: timestamp,
      nonce: nonce
    };
    const sortedKeys = Object.keys(signObj).sort();
    const queryStr = sortedKeys.map(key => {
      const val = signObj[key] ?? "";
      const k = encodeURIComponent(key).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
      const v = encodeURIComponent(String(val)).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
      return `${k}=${v}`;
    }).join("&");
    const fullUrl = `${this.baseUrl}${path}`;
    const rawSign = `${fullUrl}${queryStr}${this.salt}`;
    const sign = this.md5(rawSign);
    return {
      timestamp: timestamp,
      nonce: nonce,
      sign: sign
    };
  }
  async req(method, path, data = {}, customHeaders = {}) {
    try {
      const payloadForSign = data || {};
      const {
        timestamp,
        nonce,
        sign
      } = this.generateSign(path, payloadForSign);
      const headers = {
        ...this.baseHeaders,
        ...customHeaders
      };
      if (this.token) headers["authorization"] = this.token;
      const isGet = method.toLowerCase() === "get";
      const queryParams = {
        timestamp: timestamp,
        nonce: nonce,
        sign: sign
      };
      if (isGet) Object.assign(queryParams, payloadForSign);
      const config = {
        method: method,
        url: `${this.baseUrl}${path}`,
        headers: headers,
        params: queryParams,
        data: isGet ? undefined : payloadForSign
      };
      const res = await axios(config);
      const resData = res?.data;
      if (resData?.error) {
        if (!path.includes("profile")) {
          throw new Error(resData?.msg || "API Error");
        }
      }
      return resData;
    } catch (e) {
      const msg = e?.response?.data?.msg || e?.message || "Unknown Error";
      this.log(`Req Error [${path}]: ${msg}`);
      throw e;
    }
  }
  async login() {
    if (this.token) return;
    this.log("1. Login Anonymous...");
    const res = await this.req("post", "/sso/anonymous-login");
    const d = res?.data;
    this.token = d?.token || res?.token;
    this.uid = d?.userInfo?.uid;
    if (!this.token && this.uid) {
      this.token = "e50ed9be9207e7f20704621f96059ab0";
    }
    this.log(`   Login Success. Token: ${this.token ? "OK" : "Missing"}`);
  }
  async downloadImage(url) {
    this.log("   Downloading Image...");
    const res = await axios.get(url, {
      responseType: "arraybuffer"
    });
    const mime = res.headers["content-type"] || "image/jpeg";
    const ext = mime.split("/")[1] || "jpeg";
    return {
      buffer: Buffer.from(res.data),
      mime: mime,
      fileName: `${this.rand(10)}.${ext}`
    };
  }
  async stepUpload(imageUrl) {
    this.log("2. Request Upload URL...");
    let fileData;
    if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
      fileData = await this.downloadImage(imageUrl);
    } else {
      throw new Error("Input must be HTTP URL for this demo");
    }
    const {
      buffer,
      mime,
      fileName
    } = fileData;
    const preRes = await this.req("post", "/get-upload-url", {
      file_name: fileName,
      content_type: mime
    });
    const {
      url,
      key
    } = preRes?.data || {};
    if (!url) throw new Error("Upload URL failed");
    this.log(`   PUT to S3 (${buffer.length} bytes)...`);
    await axios.put(url, buffer, {
      headers: {
        "Content-Type": mime
      }
    });
    this.uploadedKey = key;
    return key;
  }
  async stepRunPod(params) {
    this.log("3. Submit Task (RunPod)...");
    const mode = params.mode || "Undress";
    const inputJson = JSON.stringify({
      image: this.uploadedKey,
      seed: Math.floor(Math.random() * 4294967295),
      seed1: Math.floor(Math.random() * 4294967295),
      seed2: Math.floor(Math.random() * 4294967295),
      seed3: Math.floor(Math.random() * 4294967295),
      aspectRatio: "1:1",
      mode: "移除女性身上所有的衣物，泳衣，裤子，使其全身裸体。",
      breast_size: "",
      pussy_haircut: "",
      age: "",
      body_type: ""
    });
    const originalInputJson = JSON.stringify({
      mode: "Undress",
      breast_size: "",
      pussy_haircut: "",
      age: "",
      body_type: ""
    });
    const res = await this.req("post", "/tool/runpod", {
      tool_id: "29",
      input: inputJson,
      original_input: originalInputJson
    });
    return res?.data?.pid;
  }
  async stepCheckProfile() {
    this.log("4. Check Profile (Background Check)...");
    await this.req("get", "/my/profile");
  }
  async stepCheckToolConfig() {
    this.log("5. Check Tool Config...");
    await this.req("get", "/tool", {
      tool_id: 29,
      module_key: "undress"
    });
  }
  async stepPolling(pid) {
    this.log(`6. Polling Progress (PID: ${pid})...`);
    let status = 0;
    let attempts = 0;
    const max = 60;
    while (attempts < max) {
      attempts++;
      await this.sleep(2e3);
      const res = await this.req("get", "/tool/get-prediction-progress", {
        pid: pid
      });
      const innerData = res?.data || {};
      status = innerData.status ?? 0;
      if (status === 1) {
        this.log("   Task Finished!", innerData);
        this.log("7. Fetch Output List...");
        const listRes = await this.req("post", "/generated/output-list", {
          tool_id: 29,
          p: 1,
          pid: pid
        });
        return {
          status: "success",
          output: innerData.output,
          listData: listRes?.data
        };
      } else if (status === 2 || innerData.error) {
        this.log("   Task Failed/NSFW.");
        return {
          status: "failed",
          data: innerData
        };
      } else {
        process.stdout.write(`\r   Processing... Status: ${status} (${attempts}/${max})`);
      }
    }
    return {
      status: "timeout"
    };
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    try {
      await this.login();
      await this.stepUpload(imageUrl);
      const pid = await this.stepRunPod(rest);
      if (!pid) throw new Error("No PID returned");
      this.log(`   PID: ${pid}`);
      await this.stepCheckProfile();
      await this.stepCheckToolConfig();
      return await this.stepPolling(pid);
    } catch (e) {
      this.log("Fatal Error:", e.message);
      return {
        status: "error",
        msg: e.message
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
  const api = new LovePal();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}