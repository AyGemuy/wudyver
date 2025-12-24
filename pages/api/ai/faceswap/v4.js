import fetch from "node-fetch";
import FormData from "form-data";
import crypto from "crypto";
async function fetchWithTimeout(url, options = {}, timeout = 6e4) {
  return Promise.race([fetch(url, options), new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), timeout))]);
}
class FaceSwapClient {
  constructor(baseUrl = "https://swapynode.starlor.ai") {
    this.baseUrl = baseUrl;
    this.deviceId = null;
    this.apiKey = null;
  }
  async ensureReg() {
    if (this.deviceId && this.apiKey) {
      return {
        success: true,
        deviceId: this.deviceId,
        apiKey: this.apiKey
      };
    }
    return await this.register();
  }
  async register({
    deviceId,
    platform = "android",
    deviceName = "Unknown",
    model = "Unknown",
    osVersion = "1.0",
    appVersion = "1.0.0"
  } = {}) {
    try {
      const id = deviceId || crypto.randomUUID();
      const payload = {
        deviceId: id,
        deviceInfo: {
          platform: platform,
          deviceName: deviceName,
          model: model,
          osVersion: osVersion,
          appVersion: appVersion
        }
      };
      const res = await fetchWithTimeout(`${this.baseUrl}/api/devices/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }, 3e4);
      const data = await res.json();
      if (data?.success) {
        this.deviceId = data?.data?.deviceId || data?.deviceId;
        this.apiKey = data?.data?.apiKey || data?.apiKey;
        return {
          success: true,
          deviceId: this.deviceId,
          apiKey: this.apiKey
        };
      }
      return {
        success: false,
        message: data?.error || data?.message || "Register failed"
      };
    } catch (e) {
      return {
        success: false,
        message: e.message
      };
    }
  }
  async generate({
    video = false,
    multi = false,
    source,
    target,
    indices,
    onProgress
  } = {}) {
    try {
      const reg = await this.ensureReg();
      if (!reg.success) throw new Error("Registration failed: " + reg.message);
      if (video) return await this.genVideo({
        source: source,
        target: target,
        onProgress: onProgress
      });
      const srcBuf = await this.toBuf(source);
      const tgtBuf = await this.toBuf(target);
      if (!srcBuf || !tgtBuf) throw new Error("Invalid source/target");
      const form = new FormData();
      if (multi) {
        form.append("template", srcBuf, {
          filename: "source.jpg",
          contentType: "image/jpeg"
        });
        form.append("sourceFaces", tgtBuf, {
          filename: "target.jpg",
          contentType: "image/jpeg"
        });
        if (indices?.length) form.append("faceIndices", indices.join(","));
        form.append("platform", "android");
        const res = await this.req("/faceswap/multiple", form);
        const data = await res.json();
        return {
          success: data?.success || false,
          resultUrl: data?.data?.resultUrl || data?.resultUrl,
          facesSwapped: data?.data?.facesSwapped || 0,
          message: data?.message
        };
      }
      form.append("srcimage", srcBuf, {
        filename: "source.jpg",
        contentType: "image/jpeg"
      });
      form.append("targetimage", tgtBuf, {
        filename: "target.jpg",
        contentType: "image/jpeg"
      });
      form.append("enhance", "true");
      form.append("platform", "android");
      const res = await this.req("/faceswap", form);
      const data = await res.json();
      return {
        success: data?.success || false,
        resultUrl: data?.data?.resultUrl || data?.resultUrl || data?.data?.result,
        message: data?.message
      };
    } catch (e) {
      return {
        success: false,
        message: e.message
      };
    }
  }
  async genVideo({
    source,
    target,
    onProgress
  } = {}) {
    try {
      const srcBuf = await this.toBuf(source);
      const tgtBuf = await this.toBuf(target);
      if (!srcBuf || !tgtBuf) throw new Error("Invalid source/target");
      const form = new FormData();
      form.append("srcimage", srcBuf, {
        filename: "source.jpg",
        contentType: "image/jpeg"
      });
      form.append("targetvideo", tgtBuf, {
        filename: "target.mp4",
        contentType: "video/mp4"
      });
      form.append("enhance", "true");
      form.append("platform", "android");
      const res = await this.req("/faceswap/video", form);
      const data = await res.json();
      if (!data?.success) {
        return {
          success: false,
          message: data?.error || "Video job failed"
        };
      }
      const jobId = data?.data?.jobId || data?.jobId;
      return await this.pollJob(jobId, onProgress);
    } catch (e) {
      return {
        success: false,
        message: e.message
      };
    }
  }
  async pollJob(jobId, onProgress, maxWait = 36e5) {
    const interval = 3e3;
    let elapsed = 0;
    while (elapsed < maxWait) {
      await new Promise(r => setTimeout(r, interval));
      elapsed += interval;
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/faceswap/video/status?jobId=${jobId}`, {}, 3e4);
        if (res.status === 404) {
          return {
            success: false,
            message: "Job not found"
          };
        }
        const data = await res.json();
        const progress = (data?.data?.progress || 0) * 100;
        const status = (data?.data?.status || "").toLowerCase();
        onProgress?.(progress, data?.data?.message || "Processing...");
        if (data?.success && status === "success") {
          return {
            success: true,
            resultUrl: data?.data?.resultUrl || data?.data?.result,
            message: "Completed"
          };
        }
        if (!data?.success || status === "failed") {
          return {
            success: false,
            message: data?.data?.error || data?.message || "Job failed"
          };
        }
      } catch (e) {
        if (e.message.includes("timeout")) {
          console.warn("[Poll] Timeout, retrying...");
        } else {
          console.error("[Poll] Error:", e.message);
        }
      }
    }
    return {
      success: false,
      message: "Timeout after 1 hour"
    };
  }
  async toBuf(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("data:")) {
          return Buffer.from(input.split(",")[1], "base64");
        }
        if (input.startsWith("http")) {
          const res = await fetchWithTimeout(input, {}, 3e4);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuf = await res.arrayBuffer();
          return Buffer.from(arrayBuf);
        }
        if (/^[A-Za-z0-9+/=]+$/.test(input)) {
          return Buffer.from(input, "base64");
        }
      }
      throw new Error("Invalid input");
    } catch (e) {
      console.error("[ToBuf] Error:", e.message);
      return null;
    }
  }
  async req(path, form, timeout = 6e4) {
    const url = `${this.baseUrl}${path}`;
    const headers = form?.getHeaders ? form.getHeaders() : {
      "Content-Type": "application/json"
    };
    if (this.apiKey) headers["X-API-Key"] = this.apiKey;
    return await fetchWithTimeout(url, {
      method: "POST",
      headers: headers,
      body: form
    }, timeout);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.source || !params.target) {
    return res.status(400).json({
      error: "source and target images are required"
    });
  }
  try {
    const api = new FaceSwapClient();
    const result = await api.generate(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(result);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}