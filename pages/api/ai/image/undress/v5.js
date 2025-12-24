import axios from "axios";
import FormData from "form-data";
import {
  randomBytes
} from "crypto";
class UndressAI {
  constructor() {
    this.baseUrl = "https://api.undresswith.ai/api";
    this.googleKey = "AIzaSyDkChmbBT5DiK0HNTA8Ffx8NJq7reWkS6I";
    this.sessionToken = null;
    this.uid = null;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: "https://undresswith.ai",
      referer: "https://undresswith.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-client-version": "Chrome/JsCore/11.0.1/FirebaseCore-web"
    };
    this.email = `${this.rnd(12)}@emailhook.site`;
    this.password = this.email;
  }
  log(msg, type = "INFO") {
    console.log(`[${new Date().toISOString()}] [${type}] ${msg}`);
  }
  rnd(len) {
    return randomBytes(len).toString("hex").slice(0, len);
  }
  async req(method, url, data = null, headers = {}) {
    try {
      const config = {
        method: method,
        url: url,
        headers: {
          ...this.headers,
          ...headers
        },
        data: data
      };
      if (this.sessionToken) {
        config.headers["x-session-token"] = this.sessionToken;
      }
      const res = await axios(config);
      return res?.data;
    } catch (e) {
      const serverMsg = e.response?.data?.message || JSON.stringify(e.response?.data);
      this.log(`Request Error (${url}): ${e.message} | Server: ${serverMsg}`, "ERROR");
      throw e;
    }
  }
  async auth() {
    this.log("Authenticating with Google Identity Toolkit...");
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.googleKey}`;
    const authData = await this.req("POST", authUrl, {
      returnSecureToken: true,
      email: this.email,
      password: this.password,
      clientType: "CLIENT_TYPE_WEB"
    });
    const idToken = authData?.idToken;
    if (!idToken) throw new Error("Failed to get Google ID Token");
    this.log("Initializing App Session...");
    const initData = await this.req("POST", `${this.baseUrl}/user/init_data`, {
      token: idToken,
      code: "-1",
      login_type: 0,
      current_uid: ""
    });
    const data = initData?.data;
    this.sessionToken = data?.session_token;
    this.uid = data?.code;
    if (!this.sessionToken) {
      this.log("Init Response: " + JSON.stringify(initData), "DEBUG");
      throw new Error("Failed to extract session_token from init_data");
    }
    this.log(`Auth Success. UID: ${this.uid} | Token: ${this.sessionToken.slice(0, 10)}...`);
  }
  async getImg(source) {
    try {
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string") {
        if (source.startsWith("http")) {
          const res = await axios.get(source, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (source.startsWith("data:")) {
          return Buffer.from(source.split(",")[1], "base64");
        }
        return Buffer.from(source, "base64");
      }
      throw new Error("Invalid image format");
    } catch (e) {
      throw new Error(`Image processing failed: ${e.message}`);
    }
  }
  async upload(buffer) {
    this.log("Getting Pre-signed URL...");
    const filename = `${this.rnd(8)}.jpg`;
    const preData = await this.req("POST", `${this.baseUrl}/item/get_pre_url`, {
      file_name: filename,
      file_type: 0
    });
    if (preData?.code !== 1) {
      throw new Error(`Upload Init Failed: ${preData?.message || "Unknown error"}`);
    }
    const {
      url,
      fields
    } = preData?.data || {};
    if (!url || !fields) throw new Error("Failed to get upload URL structure");
    this.log("Uploading to S3...");
    const form = new FormData();
    Object.keys(fields).forEach(key => form.append(key, fields[key]));
    form.append("file", buffer, filename);
    await axios.post(url, form, {
      headers: form.getHeaders()
    });
    return fields.key;
  }
  async poll(targetUid) {
    this.log(`Polling task ${targetUid}...`);
    let retries = 0;
    const maxRetries = 60;
    while (retries < maxRetries) {
      const res = await this.req("POST", `${this.baseUrl}/item/get_items`, {
        page: 0,
        page_size: 50
      });
      const items = res?.data?.items || [];
      const item = items.find(i => i.uid === targetUid) || items[0];
      if (item) {
        const status = item.status;
        if (status === 2) {
          this.log("Task Completed.");
          return {
            result: items,
            token: this.sessionToken
          };
        } else if (status < 0) {
          throw new Error("Task Failed by Server (Status < 0)");
        }
        this.log(`Status: ${status} (Waiting...)`);
      }
      await new Promise(r => setTimeout(r, 3e3));
      retries++;
    }
    throw new Error("Timeout polling result");
  }
  async generate({
    token = this.sessionToken,
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      this.log("Starting generation process...");
      if (!token) await this.auth();
      const imgBuffer = await this.getImg(imageUrl);
      const s3Path = await this.upload(imgBuffer);
      this.log("Sending inference request...");
      const infPayload = {
        s3_path: s3Path,
        mask_path: "",
        prompt: prompt || "nude, raw photo, 8k",
        ai_model_type: rest?.modelType || 2,
        ...rest
      };
      const infRes = await this.req("POST", `${this.baseUrl}/item/inference2`, infPayload);
      if (infRes?.code !== 1) {
        throw new Error(`Inference Error: ${infRes?.message}`);
      }
      const itemUid = infRes?.data?.item?.uid;
      if (!itemUid) throw new Error("Inference started but no Item UID returned");
      return await this.poll(itemUid);
    } catch (error) {
      this.log(`Generate Failed: ${error.message}`, "ERROR");
      return {
        result: [],
        error: error.message
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
  const api = new UndressAI();
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