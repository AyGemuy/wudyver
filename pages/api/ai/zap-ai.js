import axios from "axios";
import https from "https";
const agent = new https.Agent({
  keepAlive: true,
  timeout: 0
});
class ThirdParty {
  constructor({
    baseURL = "http://13.201.185.185:8000"
  } = {}) {
    this.baseURL = baseURL.replace(/\/+$/, "");
    this.deviceId = "c2e1b0d5f1891d8e";
    this.uniqueId = "UNT1YwrmeYQ";
    this.xRequestId = "U2FsdGVkX19LtPcI4X42Zlibh0rmSyjQQtLE2OOmEb9mtCkzSbjHcX8fAopAH4LJ";
    this.isLoggedIn = false;
    this.client = axios.create({
      baseURL: baseURL,
      httpsAgent: agent,
      headers: this.buildHeaders(),
      decompress: true
    });
  }
  buildHeaders({
    useDeviceAsUnique = false
  } = {}) {
    return {
      "User-Agent": "okhttp/4.12.0",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "x-request-id": this.xRequestId,
      uniqueId: useDeviceAsUnique ? this.deviceId : this.uniqueId
    };
  }
  async _request({
    method = "post",
    path,
    payload = {},
    useDeviceAsUnique = false
  } = {}) {
    const url = `${this.baseURL}${path}`;
    const fullPayload = {
      deviceId: this.deviceId,
      ...payload
    };
    const headers = this.buildHeaders({
      useDeviceAsUnique: useDeviceAsUnique
    });
    console.log(`[REQ] ${method.toUpperCase()} ${path}`);
    console.log("→ deviceId:", this.deviceId);
    console.log("→ x-request-id:", headers["x-request-id"]);
    console.log("→ uniqueId:", headers.uniqueId);
    console.log("→ payload:", JSON.stringify(fullPayload));
    try {
      const res = await this.client.request({
        method: method,
        url: url,
        data: fullPayload,
        headers: headers
      });
      console.log("[RES] Success →", res.data?.data ? "OK" : "Empty");
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.message || "Network error";
      console.error("[ERR]", status ? `${status}: ${msg}` : msg);
      const errorData = {
        error: msg
      };
      throw {
        isWorkerError: true,
        data: errorData
      };
    }
  }
  async login() {
    if (this.isLoggedIn) {
      console.log("[LOGIN] Already logged in");
      return true;
    }
    console.log("[LOGIN] Logging in...");
    try {
      const res = await this._request({
        path: "/api/user/login",
        payload: {
          deviceId: this.deviceId
        },
        useDeviceAsUnique: true
      });
      if (res.success !== false) {
        this.isLoggedIn = true;
        console.log("[LOGIN] Success");
        return true;
      }
      throw new Error("Login failed");
    } catch (err) {
      this.isLoggedIn = false;
      throw err;
    }
  }
  async createThread({
    apiProvider = "OpenAi"
  } = {}) {
    console.log("[THREAD] Creating new thread...");
    try {
      const res = await this._request({
        path: "/api/thirdparty/provider",
        payload: {
          apiProvider: apiProvider,
          filedObj: {
            apiType: "createThread"
          }
        },
        useDeviceAsUnique: false
      });
      const threadId = res.data?.id;
      if (!threadId) throw new Error("Failed to create thread");
      console.log("[THREAD] Created →", threadId);
      return threadId;
    } catch (err) {
      throw err;
    }
  }
  async chat({
    threadId,
    model = "OpenAi",
    prompt,
    messages,
    ...rest
  } = {}) {
    console.log("[CHAT] Starting chat...");
    try {
      await this.login();
      const _threadId = threadId || await this.createThread({
        apiProvider: model
      });
      const contents = messages?.length ? messages : prompt ? [{
        role: "user",
        text: prompt
      }] : [];
      if (!contents.length) throw new Error("prompt or messages required");
      console.log("→ threadId:", _threadId);
      console.log("→ contents:", contents);
      const res = await this._request({
        path: "/api/thirdparty/provider",
        payload: {
          apiProvider: model,
          filedObj: {
            apiType: "chatCompletion",
            contents: contents,
            threadId: _threadId,
            ...rest
          }
        },
        useDeviceAsUnique: false
      });
      const response = res.data?.content?.[0]?.text || "";
      console.log("[CHAT] Response →", response.substring(0, 100) + (response.length > 100 ? "..." : ""));
      return {
        threadId: _threadId,
        ...res.data
      };
    } catch (err) {
      if (err.isWorkerError) throw err;
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new ThirdParty();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}