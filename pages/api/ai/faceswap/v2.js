import fetch from "node-fetch";
import CryptoJS from "crypto-js";
class FaceSwapClient {
  constructor() {
    this.key = CryptoJS.enc.Utf8.parse("vOVH6sdmpNWjRRIq");
    this.cfg = {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    };
    this.configUrl = "https://conf.masyadi.com/api/v1/config";
    this.jobUrl = "https://job.masyadi.com/v2";
    this.statusUrl = "https://job.masyadi.com/faceswap/status";
    this.uploadUrl = "https://temp.masyadi.com/api/upload";
    this.config = null;
  }
  encrypt(text) {
    try {
      const enc = CryptoJS.AES.encrypt(text, this.key, this.cfg);
      return enc.ciphertext.toString(CryptoJS.enc.Base64);
    } catch (e) {
      console.log("❌ Encrypt error:", e.message);
      return null;
    }
  }
  decrypt(b64) {
    try {
      const dec = CryptoJS.AES.decrypt(b64, this.key, this.cfg);
      return dec.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.log("❌ Decrypt error:", e.message);
      return null;
    }
  }
  async fetchConfig() {
    try {
      const enc = this.encrypt(JSON.stringify({
        packageName: "com.onihstudio.remakeraifaceswap"
      }));
      const res = await fetch(this.configUrl, {
        method: "POST",
        headers: {
          "User-Agent": "Dart/3.8 (dart:io)",
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip"
        },
        body: JSON.stringify({
          data: enc
        })
      });
      const json = await res.json();
      const dec = this.decrypt(json?.data);
      this.config = dec ? JSON.parse(dec) : null;
      return this.config;
    } catch (e) {
      console.log("❌ Config error:", e.message);
      return null;
    }
  }
  async get(url) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Dart/3.8 (dart:io)",
          "Accept-Encoding": "gzip"
        }
      });
      return await res.json();
    } catch (e) {
      console.log("❌ GET error:", e.message);
      return null;
    }
  }
  async toB64(input) {
    try {
      if (Buffer.isBuffer(input)) return input.toString("base64");
      if (typeof input === "string") {
        if (input.startsWith("data:")) return input.split(",")[1];
        if (input.startsWith("http")) {
          const res = await fetch(input);
          const buf = Buffer.from(await res.arrayBuffer());
          return buf.toString("base64");
        }
        return input;
      }
      if (input instanceof ArrayBuffer) return Buffer.from(input).toString("base64");
      return input;
    } catch (e) {
      console.log("❌ toB64 error:", e.message);
      return null;
    }
  }
  async performPutUpload(signedUrl, imageBuffer) {
    try {
      const res = await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "User-Agent": "Dart/3.8 (dart:io)",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/octet-stream",
          "Content-Length": imageBuffer.length.toString()
        },
        body: imageBuffer
      });
      return res.ok;
    } catch (e) {
      console.log("❌ PUT upload error:", e.message);
      return false;
    }
  }
  async uploadTempFile(b64, filename = "image.png") {
    try {
      const hash = CryptoJS.SHA256(b64).toString();
      const ext = filename.split(".").pop() || "png";
      const objName = `uploads/${hash}.${ext}`;
      const enc = this.encrypt(JSON.stringify({
        bucket: "24jly3o2rh",
        objectName: objName
      }));
      const res = await fetch(this.uploadUrl, {
        method: "POST",
        headers: {
          "User-Agent": "Dart/3.8 (dart:io)",
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip"
        },
        body: JSON.stringify({
          data: enc
        })
      });
      const json = await res.json();
      const dec = this.decrypt(json?.data);
      if (!dec) return null;
      const result = JSON.parse(dec);
      if (result.exists === true) return {
        exists: true,
        objectName: objName
      };
      if (result.url && !result.exists) {
        const imageBuffer = Buffer.from(b64, "base64");
        const uploadSuccess = await this.performPutUpload(result.url, imageBuffer);
        return uploadSuccess ? {
          exists: true,
          objectName: objName
        } : null;
      }
      return null;
    } catch (e) {
      console.log("❌ Upload temp error:", e.message);
      return null;
    }
  }
  async processImg(input, name) {
    if (!input) return null;
    const b64 = await this.toB64(input);
    if (!b64) return null;
    if (!this.config) await this.fetchConfig();
    let uploadResult = null;
    if (this.config?.customConfig?.modeUpload === 2) {
      uploadResult = await this.uploadTempFile(b64, name);
    }
    return uploadResult?.exists ? {
      path: uploadResult.objectName,
      url: null
    } : null;
  }
  async processMultipleImages(images, baseName = "source") {
    const results = [];
    for (const image of images) {
      const result = await this.processImg(image, `${baseName}${results.length}.png`);
      if (!result) return null;
      results.push(result);
    }
    return results;
  }
  async poll(jobId, type = "ultra", interval = 3e3, max = 60) {
    for (let i = 0; i < max; i++) {
      const response = await this.get(`${this.statusUrl}?id=${jobId}&type=${type}`);
      if (!response) {
        await new Promise(r => setTimeout(r, interval));
        continue;
      }
      let decryptedResult = null;
      if (response.status === "completed" && response.result) {
        const decrypted = this.decrypt(response.result);
        if (decrypted) {
          try {
            decryptedResult = JSON.parse(decrypted);
            return decryptedResult;
          } catch (e) {
            console.log("❌ Failed to parse decrypted result");
          }
        }
      } else if (response.result) {
        const decrypted = this.decrypt(response.result);
        if (decrypted) {
          try {
            decryptedResult = JSON.parse(decrypted);
            if (decryptedResult.statusCode === 200 && decryptedResult.message === "success") {
              return decryptedResult;
            }
          } catch (e) {
            console.log("❌ Failed to parse decrypted result");
          }
        }
      }
      if (response.status === "failed") {
        return {
          status: "failed",
          message: response.message || "Unknown error"
        };
      }
      await new Promise(r => setTimeout(r, interval));
    }
    return {
      status: "timeout",
      message: "Polling timeout"
    };
  }
  async generate({
    multi = false,
    source,
    target,
    type = "ultra",
    faces = [0]
  }) {
    try {
      if (!this.config) await this.fetchConfig();
      const endpoint = multi ? `${this.jobUrl}/multifaceswap` : `${this.jobUrl}/faceswap`;
      const tgt = await this.processImg(target, "target.png");
      if (!tgt) return null;
      let payload;
      if (multi) {
        const sources = Array.isArray(source) ? source : [source];
        const srcs = await this.processMultipleImages(sources, "source");
        if (!srcs) return null;
        payload = {
          image_resource: srcs,
          image_target: tgt,
          faces_to_swap: faces,
          type: type,
          versi: "v3"
        };
      } else {
        const src = await this.processImg(source, "source.png");
        if (!src) return null;
        payload = {
          image_resource: src,
          image_target: tgt,
          type: type,
          versi: "v3"
        };
      }
      const token = this.encrypt(JSON.stringify(payload));
      if (!token) return null;
      const jobRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "User-Agent": "Dart/3.8 (dart:io)",
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip"
        },
        body: JSON.stringify({
          token: token
        })
      });
      const job = await jobRes.json();
      if (!job?.jobId) return null;
      const pollInt = this.config?.customConfig?.pollingInterval || 3;
      return await this.poll(job.jobId, type, pollInt * 1e3);
    } catch (e) {
      console.log("❌ Generate error:", e.message);
      return null;
    }
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
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}