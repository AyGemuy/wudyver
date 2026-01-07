import axios from "axios";
import {
  randomUUID
} from "crypto";
import {
  createHash
} from "crypto";
import FormData from "form-data";
const API = "AIzaSyAc3xKbO0g18zuwkf3q_wP2gz-VVIeHg7g";
const BASE = "https://www.googleapis.com/identitytoolkit/v3/relyingparty";
const BUCKET = "android-video-9f8cb.firebasestorage.app";
const FN = "https://us-central1-android-video-9f8cb.cloudfunctions.net";
const FIRESTORE = "https://firestore.googleapis.com/v1/projects/android-video-9f8cb/databases/(default)/documents";
const HEADERS = {
  "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
  "X-Android-Package": "com.aivideoveo.app",
  "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
  "Accept-Language": "id-ID, en-US",
  "X-Client-Version": "Android/Fallback/X22003000/FirebaseCore-Android",
  "X-Firebase-GMPID": "1:497896976149:android:2c1a7d1b28d38b45e7431c",
  "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA",
  "X-Firebase-AppCheck": "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ=="
};
const MODELS = {
  seedance: {
    t2v: "generateVideoSeedance",
    i2v: "generateImageToVideoSeedance"
  },
  grok: {
    t2v: "generateVideoGrok",
    i2v: "generateImageToVideoGrok"
  },
  kling: {
    t2v: "generateVideo",
    i2v: "generateImageToVideo"
  },
  veo3: {
    t2v: "generateVideoVeo3",
    i2v: "generateImageToVideoVeo3"
  }
};
class AIVideo {
  constructor(model = "seedance") {
    this.ax = axios.create({
      headers: HEADERS
    });
    this.model = model;
    this.androidId = this.genId();
    this.cache = {
      token: null,
      claimed: false
    };
  }
  genId() {
    return createHash("md5").update(randomUUID()).digest("hex").slice(0, 16);
  }
  setModel(m) {
    if (!MODELS[m]) throw new Error(`Invalid model: ${m}. Use: ${Object.keys(MODELS).join(", ")}`);
    this.model = m;
    console.log("[Model] Set:", m);
    return this;
  }
  async init(t) {
    if (t && this.cache.claimed) return t;
    const token = t || this.cache.token;
    console.log(token ? "[Init] Using token" : "[Init] Creating token...");
    try {
      let finalToken = token;
      if (!finalToken) {
        const {
          data
        } = await this.ax.post(`${BASE}/signupNewUser?key=${API}`, {
          clientType: "CLIENT_TYPE_ANDROID"
        });
        finalToken = data?.idToken;
        console.log("[Init] Token created");
      }
      if (!this.cache.claimed) {
        console.log("[Init] Claiming credit...");
        const {
          data
        } = await this.ax.post(`${FN}/createUserWithInitialCredits`, {
          data: {
            androidId: this.androidId
          }
        }, {
          headers: {
            authorization: `Bearer ${finalToken}`,
            "User-Agent": "okhttp/4.12.0"
          }
        });
        const r = data?.result;
        console.log(`[Init] Credit: ${r?.credits || 0} (${r?.isNewUser ? "New User" : "Existing"})`);
        this.cache.claimed = true;
      }
      this.cache.token = finalToken;
      return finalToken;
    } catch (e) {
      console.error("[Init] Error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async upload(token, media) {
    const buf = Buffer.isBuffer(media) ? media : media?.startsWith("http") ? (await axios.get(media, {
      responseType: "arraybuffer"
    })).data : Buffer.from(media?.replace(/^data:image\/\w+;base64,/, "") || "", "base64");
    const id = randomUUID();
    const name = `images/${id}.jpg`;
    console.log("[Upload] Start:", name.slice(0, 30) + "...");
    try {
      const form = new FormData();
      form.append("file", buf, {
        filename: name,
        contentType: "image/jpeg"
      });
      const {
        data
      } = await axios.post(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?name=${name}`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Firebase ${token}`,
          "X-Firebase-Storage-Version": "Android/20.3.0",
          "x-firebase-gmpid": HEADERS["X-Firebase-GMPID"],
          "x-firebase-appcheck": HEADERS["X-Firebase-AppCheck"],
          "User-Agent": HEADERS["User-Agent"]
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(name)}?alt=media&token=${data?.downloadTokens}`;
      console.log("[Upload] Done");
      return downloadUrl;
    } catch (e) {
      console.error("[Upload] Form-data failed:", e?.response?.data || e.message);
      try {
        console.log("[Upload] Retry with resumable...");
        return await this.uploadResumable(token, buf, name);
      } catch (e2) {
        console.error("[Upload] Resumable failed:", e2?.response?.data || e2.message);
        throw e2;
      }
    }
  }
  async uploadResumable(token, buffer, name) {
    try {
      const init = await axios.post(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?name=${name}&uploadType=resumable`, null, {
        headers: {
          Authorization: `Firebase ${token}`,
          "Content-Type": "application/octet-stream",
          "X-Firebase-Storage-Version": "Android/20.3.0",
          "x-firebase-gmpid": HEADERS["X-Firebase-GMPID"],
          "x-firebase-appcheck": HEADERS["X-Firebase-AppCheck"],
          "User-Agent": HEADERS["User-Agent"]
        }
      });
      const uploadUrl = init?.headers?.location || init?.headers?.["x-goog-upload-url"];
      if (!uploadUrl) throw new Error("No upload URL");
      await axios.put(uploadUrl, buffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Goog-Upload-Command": "upload, finalize",
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Offset": "0"
        },
        maxBodyLength: Infinity
      });
      const {
        data
      } = await axios.get(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(name)}`, {
        headers: {
          Authorization: `Firebase ${token}`
        }
      });
      return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(name)}?alt=media&token=${data?.downloadTokens}`;
    } catch (e) {
      throw e;
    }
  }
  async generate({
    token,
    prompt,
    media,
    aspectRatio = "PORTRAIT",
    model,
    ...rest
  }) {
    const t = await this.init(token);
    const m = model || this.model;
    const endpoint = MODELS[m];
    if (!endpoint) throw new Error(`Invalid model: ${m}`);
    const videoId = randomUUID();
    console.log(`[Generate] VideoID: ${videoId} | Model: ${m}`);
    try {
      const payload = {
        data: {
          videoId: videoId,
          aspectRatio: aspectRatio,
          prompt: prompt
        }
      };
      if (media) {
        payload.data.imageUrl = await this.upload(t, media);
        console.log("[Generate] Type: Image2Video");
        const {
          data
        } = await this.ax.post(`${FN}/${endpoint.i2v}`, payload, {
          headers: {
            authorization: `Bearer ${t}`,
            "User-Agent": "okhttp/4.12.0"
          }
        });
        console.log("[Generate] TaskID:", data?.result?.taskId);
        return {
          token: t,
          taskId: data?.result?.taskId,
          videoId: videoId,
          model: m
        };
      }
      console.log("[Generate] Type: Text2Video");
      const {
        data
      } = await this.ax.post(`${FN}/${endpoint.t2v}`, payload, {
        headers: {
          authorization: `Bearer ${t}`,
          "User-Agent": "okhttp/4.12.0"
        }
      });
      console.log("[Generate] TaskID:", data?.result?.taskId);
      return {
        token: t,
        taskId: data?.result?.taskId,
        videoId: videoId,
        model: m
      };
    } catch (e) {
      console.error("[Generate] Error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async checkOnce(token, videoId) {
    try {
      const {
        data
      } = await this.ax.get(`${FIRESTORE}/videos/${videoId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const f = data?.fields || {};
      return {
        token: token,
        status: f?.status?.stringValue || "unknown",
        videoUrl: f?.videoUrl?.stringValue || null,
        error: f?.error?.stringValue || null,
        progress: f?.progress?.integerValue || f?.progress?.doubleValue || null,
        source: "firestore"
      };
    } catch (e) {
      if (e?.response?.status === 404) {
        try {
          const {
            data
          } = await this.ax.get(`${FIRESTORE}/tasks/${videoId}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          return {
            token: token,
            status: data?.fields?.status?.stringValue || "PENDING",
            videoUrl: null,
            error: null,
            progress: null,
            source: "tasks"
          };
        } catch (e2) {
          if (e2?.response?.status === 404) {
            return {
              token: token,
              status: "PENDING",
              videoUrl: null,
              error: null,
              progress: null,
              source: "pending"
            };
          }
          throw e2;
        }
      }
      throw e;
    }
  }
  async status({
    token,
    videoId,
    poll = false,
    interval = 3e3,
    timeout = 6e5,
    ...rest
  }) {
    if (!videoId) throw new Error("videoId is required");
    const t = await this.init(token);
    if (!poll) {
      console.log("[Status] Check:", videoId?.slice(0, 20) + "...");
      const result = await this.checkOnce(t, videoId);
      console.log(`[Status] ${result.status}${result.progress ? ` (${result.progress}%)` : ""}`);
      return result;
    }
    console.log(`[Status] Polling: ${videoId?.slice(0, 20)}... (interval: ${interval}ms)`);
    const startTime = Date.now();
    while (true) {
      try {
        const result = await this.checkOnce(t, videoId);
        console.log(`[Status] ${result.status}${result.progress ? ` (${result.progress}%)` : ""}`);
        if (result.status === "COMPLETED") {
          console.log("[Status] ✅ Completed");
          return result;
        }
        if (result.status === "FAILED") {
          console.log("[Status] ❌ Failed");
          throw new Error(result.error || "Generation failed");
        }
        if (Date.now() - startTime > timeout) {
          console.log("[Status] ⏱️ Timeout");
          throw new Error(`Polling timeout after ${timeout}ms`);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (e) {
        if (e.message?.includes("timeout") || e.message?.includes("failed")) {
          throw e;
        }
        console.error("[Status] Error:", e.message);
        throw e;
      }
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi",
      actions: ["generate", "status"]
    });
  }
  const api = new AIVideo();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'",
            example: {
              action: "generate",
              prompt: "A futuristic car driving through neon city"
            }
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.videoId || !params.token) {
          return res.status(400).json({
            error: "Parameter 'videoId' dan 'token' wajib diisi untuk action 'status'",
            example: {
              action: "status",
              videoId: "xxxxxxxxx",
              token: "eyxxxxxxxxx"
            }
          });
        }
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "status"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}