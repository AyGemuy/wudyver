import axios from "axios";
import FormData from "form-data";
import {
  webcrypto as crypto
} from "crypto";
class PRNG {
  constructor(e) {
    this.seed = this.hashCode(e);
  }
  hashCode(e) {
    let a = 0;
    for (let t = 0; t < e.length; t++) a = (a << 5) - a + e.charCodeAt(t), a &= a;
    return Math.abs(a);
  }
  next() {
    return this.seed = (9301 * this.seed + 49297) % 233280, this.seed / 233280;
  }
}
class InfipAI {
  constructor() {
    this.apiBase = "https://infip.pro";
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  u(e = 32) {
    const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let t = "";
    for (let r = 0; r < e; r++) t += a.charAt(Math.floor(Math.random() * a.length));
    return t;
  }
  async m(e) {
    const a = new TextEncoder().encode(e + Math.random().toString());
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", a))).map(e => e.toString(16).padStart(2, "0")).join("").slice(0, 16);
  }
  async shaFull(e) {
    const a = new TextEncoder().encode(e);
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", a))).map(e => e.toString(16).padStart(2, "0")).join("");
  }
  async getFingerprint() {
    const components = {
      canvas: "no-canvas",
      webgl: "no-webgl",
      audio: "audio-error",
      fonts: "no-fonts",
      screen: "1920x1080x24x24x1x1920x1040",
      timezone: "Asia/Jakarta::-420",
      languages: "en-US,en",
      plugins: "no-plugins",
      hardware: "16::8::0",
      performance: "no-perf"
    };
    const raw = Object.entries(components).map(([k, v]) => `${k}:${v}`).join("||");
    return await this.shaFull(raw);
  }
  async aesEncrypt(dataStr, password) {
    const enc = new TextEncoder();
    const rawData = enc.encode(dataStr);
    const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits", "deriveKey"]);
    const key = await crypto.subtle.deriveKey({
      name: "PBKDF2",
      salt: enc.encode("ghostbot-salt"),
      iterations: 1e5,
      hash: "SHA-256"
    }, keyMaterial, {
      name: "AES-GCM",
      length: 256
    }, false, ["encrypt", "decrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await crypto.subtle.encrypt({
      name: "AES-GCM",
      iv: iv,
      tagLength: 128
    }, key, rawData);
    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
      iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
      tagLength: 16
    };
  }
  shuffle(dataUint8, seedStr) {
    let rng = new PRNG(seedStr);
    let arr = new Uint8Array(dataUint8);
    for (let e = arr.length - 1; e > 0; e--) {
      let a = Math.floor(rng.next() * (e + 1));
      [arr[e], arr[a]] = [arr[a], arr[e]];
    }
    return arr;
  }
  xor(dataUint8, keyStr) {
    let keyBytes = new TextEncoder().encode(keyStr);
    let res = new Uint8Array(dataUint8.length);
    for (let a = 0; a < dataUint8.length; a++) {
      res[a] = dataUint8[a] ^ keyBytes[a % keyBytes.length];
    }
    return res;
  }
  async encryptPayload(payloadObj, fp, salt) {
    const l = fp;
    const c = salt;
    const rawKeys = ["R2hvc3Rib3Q=", "V2ViU2VjdXJl", "S2V5MjAyNQ==", "RW5jcnlwdGlvbg=="].map(e => atob(e)).join("::") + c;
    const d = btoa(rawKeys);
    const decoys = {};
    for (let k of ["256", "384", "512"]) decoys[`_sha${k}`] = await this.m(`sha${k}-${Date.now()}`);
    for (let i = 0; i < 10; i++) decoys[`_xor${i}`] = this.u(24);
    const fullObj = {
      ...payloadObj,
      _fp: l,
      _ts: Date.now(),
      _salt: c,
      ...decoys,
      _g66: await this.m("g66"),
      _q16: this.u(18),
      _q810: this.u(18),
      _r26: this.u(16),
      _r602: this.u(20),
      _r890: this.u(18),
      _s259: this.u(32),
      _s858: this.u(28),
      _s921: this.u(18),
      _session: this.u(20),
      _sid1: this.u(32),
      _sig2: this.u(16),
      _sig3: this.u(16),
      _t136: this.u(20),
      _t596: this.u(20),
      _t923: this.u(20),
      _token: this.u(40),
      _secret: this.u(32),
      _u113: this.u(20),
      _u360: this.u(36),
      _u825: this.u(32),
      _v239: this.u(16),
      _v290: this.u(16),
      _v808: this.u(16),
      _verify2: await this.m("verify2"),
      _w358: this.u(16),
      _w443: this.u(16),
      _d1: Math.random().toString(36),
      _d2: Date.now() % 1e3,
      _d3: `noise_${Date.now()}`,
      _vector: [649.1776658554661, 325.9639916579009, 777.0427],
      _matrix: this.u(32),
      _noise: btoa(Math.random().toString()),
      _entropy: Math.floor(Math.random() * 999999),
      _chaos: this.u(28)
    };
    const jsonStr = JSON.stringify(fullObj);
    const encodedJson = new TextEncoder().encode(jsonStr);
    const shuffled = this.shuffle(encodedJson, c + l);
    const xored = this.xor(shuffled, d + l);
    const preAesString = btoa(String.fromCharCode(...xored));
    const {
      encrypted,
      iv,
      tagLength
    } = await this.aesEncrypt(preAesString, d);
    return btoa(`${encrypted}::${iv}::${tagLength}`);
  }
  async generatePoW(e, a, t, r = 4) {
    console.log("⛏️ Mining PoW...");
    const target = "0".repeat(r);
    let s = 0,
      n = "";
    const enc = new TextEncoder();
    while (!n.startsWith(target)) {
      const str = e + a + t + s.toString();
      const hash = await crypto.subtle.digest("SHA-256", enc.encode(str));
      n = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
      if (++s > 2e6) break;
    }
    return n;
  }
  async signHMAC(keyStr, dataStr) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(keyStr), {
      name: "HMAC",
      hash: "SHA-256"
    }, false, ["sign"]);
    const sign = await crypto.subtle.sign("HMAC", key, enc.encode(dataStr));
    return btoa(String.fromCharCode(...new Uint8Array(sign)));
  }
  async generateHeaders(fp, sessionToken, entropy) {
    const t = Date.now().toString(36);
    const sigs = {};
    for (let i = 0; i < 26; i++) {
      const c = String.fromCharCode(97 + i);
      sigs[`x-sig-${c}`] = await this.m(`sig-${c}-${Date.now()}-${i}`);
    }
    const uuid = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
    return {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: this.apiBase,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `${this.apiBase}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": this.userAgent,
      "x-client-version": "5.0.0",
      "x-fingerprint": fp,
      "x-auth-token": `${this.u(16)}.${this.u(16)}.${this.u(8)}.${this.u(32)}.${this.u(16)}`,
      "x-bot-token": `${this.u(120)}.${await this.m("bot")}`,
      "x-session-token": sessionToken,
      "x-chaos": this.u(80),
      "x-entropy": entropy,
      "x-device-id": this.u(32),
      "x-phantom": "xx:xx:xx:xx:xx:xx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)),
      "x-ghost": Array.from({
        length: 4
      }, () => Math.floor(Math.random() * 256)).join("."),
      "x-correlation-id": uuid(),
      "x-request-id": uuid(),
      "x-trace-id": `${t}-${this.u(24)}`,
      "x-session-hash": await this.m(`session-${sessionToken}`),
      "x-nonce": await this.m(`nonce-${Date.now()}`),
      "x-sdk-hash": await this.m("sdk"),
      "x-interaction-time": Math.floor(Math.random() * 5e3).toString(),
      "x-timestamp": t,
      ...sigs
    };
  }
  async upload(media) {
    try {
      console.log("⬆️ Uploading media...");
      let buffer, filename;
      if (Buffer.isBuffer(media)) {
        buffer = media;
        filename = `img_${Date.now()}.jpg`;
      } else if (typeof media === "string" && media.startsWith("http")) {
        const res = await axios.get(media, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(res.data);
        filename = `img_${Date.now()}.jpg`;
      } else if (typeof media === "string" && media.startsWith("data:")) {
        buffer = Buffer.from(media.split(",")[1], "base64");
        filename = `img_${Date.now()}.png`;
      } else {
        return null;
      }
      const form = new FormData();
      form.append("file", buffer, {
        filename: filename
      });
      const headers = {
        ...form.getHeaders(),
        origin: this.apiBase,
        referer: `${this.apiBase}/`,
        "user-agent": this.userAgent,
        accept: "*/*"
      };
      const res = await axios.post(`${this.apiBase}/api/upload`, form, {
        headers: headers
      });
      if (res.data?.success) {
        console.log("✅ Uploaded:", res.data.file_url);
        return res.data.file_url;
      }
      throw new Error(JSON.stringify(res.data));
    } catch (e) {
      console.error("Upload error:", e.message);
      return null;
    }
  }
  async chat({
    prompt,
    media,
    model = "nano-banana",
    aspectRatio = "1:1",
    numImages = 1,
    ...rest
  }) {
    try {
      console.log(`🚀 Starting generation: "${prompt}"`);
      const fp = await this.getFingerprint();
      const salt = Math.floor(Date.now() / 12e4).toString(36);
      const seedStr = fp + salt + Date.now().toString();
      const seed = await this.shaFull(seedStr);
      let imgUrl = null;
      if (media) {
        imgUrl = await this.upload(media);
        if (!imgUrl) throw new Error("Media upload failed");
      }
      const rawPayload = {
        prompt: prompt,
        model: model,
        num_images: parseInt(numImages),
        aspect_ratio: aspectRatio,
        ...imgUrl ? {
          image_url: imgUrl
        } : {},
        ...rest
      };
      const pVal = await this.encryptPayload(rawPayload, fp, salt);
      const masterKey = "client-master-key-2025";
      const h1 = await this.signHMAC(masterKey + seed, pVal);
      const h2 = await this.signHMAC(seed + masterKey, pVal);
      const pow = await this.generatePoW(pVal, seed, salt, 4);
      const body = {
        _p: pVal,
        _s: seed,
        _fp: fp,
        _ts: salt,
        _h: h1,
        _h2: h2,
        _pow: pow,
        _t: Date.now(),
        _v: "2.1.5",
        _d1: btoa(Math.random().toString()),
        _d2: Math.floor(Math.random() * 1e3),
        _d3: `noise_${Date.now()}`
      };
      const sessionToken = this.u(40);
      const entropy = await this.m(Date.now().toString());
      const headers = await this.generateHeaders(fp, sessionToken, entropy);
      const res = await axios.post(`${this.apiBase}/api/generate-image`, body, {
        headers: headers
      });
      if (res.data?.success) {
        console.log("🎉 Success!");
        return {
          status: true,
          images: res.data.data?.image_urls || [],
          info: res.data.rateLimitInfo
        };
      }
      return {
        status: false,
        error: res.data
      };
    } catch (e) {
      console.error("❌ Process Failed:", e?.response?.data || e.message);
      return {
        status: false,
        error: e.message
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
  const api = new InfipAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}