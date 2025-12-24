import fetch from "node-fetch";
import crypto from "crypto";
import Encoder from "@/lib/encoder";
class InsMelo {
  constructor() {
    this.config = {
      baseURL: "https://server.insmelo.com",
      endpoints: {
        loginByDevice: "/api/insmelo/user/loginByDevice",
        generate: "/api/insmelo/generate",
        infoModel: "/api/insmelo/info/model",
        infoPage: "/api/insmelo/info/page"
      },
      defaultPayload: {
        headers: {
          "User-Agent": "InsMeloClient/1.0.0",
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json"
        },
        timeout: 12e4
      }
    };
    this.state = {
      token: null,
      deviceId: null,
      userId: null,
      isAuthenticated: false
    };
    this.lastResponse = null;
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  async _request(config, authStateOverride = null) {
    const authState = authStateOverride || this.state;
    if (config.requiresAuth !== false && !authStateOverride) {
      await this._ensureLogin();
    }
    const finalHeaders = {
      ...this.config.defaultPayload.headers,
      ...config.headers
    };
    if (authState.deviceId) finalHeaders["X-Device-ID"] = authState.deviceId;
    if (authState.userId) finalHeaders["X-User-ID"] = String(authState.userId);
    if (authState.token) {
      finalHeaders["Authorization"] = authState.token;
      finalHeaders["Token"] = authState.token;
    }
    const endpoint = this.config.endpoints[config.endpoint];
    if (!endpoint) throw new Error(`Endpoint tidak dikenali: ${config.endpoint}`);
    let fullUrl = `${this.config.baseURL}${endpoint}`;
    if (config.params) {
      const cleanParams = Object.fromEntries(Object.entries(config.params).filter(([_, v]) => v != null));
      if (Object.keys(cleanParams).length > 0) fullUrl += `?${new URLSearchParams(cleanParams)}`;
    }
    console.log(`\n-> ${config.method?.toUpperCase() || "GET"} ${fullUrl}`);
    const requestOptions = {
      method: config.method || "GET",
      headers: finalHeaders,
      timeout: this.config.defaultPayload.timeout
    };
    if (config.data) requestOptions.body = JSON.stringify(config.data);
    try {
      const response = await fetch(fullUrl, requestOptions);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}: ${await response.text()}`);
      const data = await (response.headers.get("content-type")?.includes("application/json") ? response.json() : response.text());
      this.lastResponse = data;
      console.log(JSON.stringify(data, null, 2));
      if (!authStateOverride) this._processResponse(data);
      return data;
    } catch (error) {
      console.error(`Request gagal: ${error.message}`);
      throw error;
    }
  }
  _processResponse(data) {
    if (data?.success && data?.data) {
      const d = data.data;
      if (d.token) this.state.token = d.token;
      if (d.id) this.state.userId = d.id;
      if (this.state.token && this.state.userId) this.state.isAuthenticated = true;
    }
  }
  async _ensureLogin() {
    if (this.state.isAuthenticated && this.state.token) return;
    console.log("Klien belum terotentikasi. Melakukan login otomatis...");
    if (!this.state.deviceId) this.state.deviceId = `InsMelo_${crypto.randomUUID()}`;
    await this.loginByDevice({
      deviceId: this.state.deviceId
    });
  }
  _getUserTimeZone() {
    const offset = -new Date().getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
    const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
    return `UTC${sign}${hours}:${minutes}`;
  }
  async loginByDevice({
    deviceId,
    ...rest
  } = {}) {
    const effectiveDeviceId = deviceId || `InsMelo_${crypto.randomUUID()}`;
    this.state.deviceId = effectiveDeviceId;
    return await this._request({
      method: "POST",
      endpoint: "loginByDevice",
      data: {
        deviceId: effectiveDeviceId,
        appVersion: "1.0.0",
        timeZone: this._getUserTimeZone(),
        sys: "insmelo",
        ...rest
      },
      requiresAuth: false
    });
  }
  async model(data = {}) {
    return await this._request({
      method: "POST",
      endpoint: "infoModel",
      data: data
    });
  }
  async generate({
    ...options
  } = {}) {
    const payload = {
      custom: false,
      instrumental: false,
      lyric: "",
      model: "chirp-v4-5",
      personaId: "chirp-v4-5",
      prompt: "",
      style: "Cinematic",
      title: "Rise of the Titans",
      generateType: "DEFAULT",
      ...options
    };
    const response = await this._request({
      method: "POST",
      endpoint: "generate",
      data: payload
    });
    if (response.success && response.data?.requestId) {
      const requestId = response.data.requestId;
      console.log(`-> Berhasil memulai. Request ID: ${requestId}`);
      const statusPayload = {
        credentials: {
          ...this.state
        },
        requestId: requestId
      };
      const task_id = await this.enc(statusPayload);
      console.log(`[GENERATE] task_id dibuat: ${task_id}`);
      return {
        task_id: task_id,
        ...response.data
      };
    }
    return response;
  }
  async status({
    task_id,
    page = 1,
    size = 20
  }) {
    if (!task_id) throw new Error("`task_id` diperlukan.");
    console.log(`[STATUS] Mendekode task_id: ${task_id}`);
    const decryptedPayload = await this.dec(task_id);
    if (!decryptedPayload?.credentials?.token || !decryptedPayload?.requestId) {
      throw new Error("Gagal mendekripsi atau task_id tidak valid (tidak ditemukan credentials atau requestId).");
    }
    const {
      credentials,
      requestId
    } = decryptedPayload;
    console.log(`--- Memulai Proses Cek Status untuk Request ID: ${requestId} ---`);
    const pageData = await this._request({
      method: "GET",
      endpoint: "infoPage",
      params: {
        category: "all",
        page: page,
        size: size
      }
    }, credentials);
    if (pageData.success && pageData.data?.records) {
      const relevantRecords = pageData.data.records.filter(record => record.requestId === requestId);
      console.log(`Ditemukan ${relevantRecords.length} lagu yang cocok dengan Request ID ${requestId}.`);
      return {
        success: true,
        code: 200,
        message: `Ditemukan ${relevantRecords.length} record yang cocok.`,
        data: {
          records: relevantRecords,
          total: relevantRecords.length,
          parentRequestId: requestId
        }
      };
    }
    return pageData;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new InsMelo();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt && !params.lyrics) {
          return res.status(400).json({
            error: "Paramenter 'prompt', atau 'lyrics' wajib diisi."
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'task_id' wajib diisi."
          });
        }
        result = await api.status(params);
        break;
      case "model":
        result = await api.model(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Gunakan: generate, status.`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[ERROR] Action '${action}':`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal."
    });
  }
}