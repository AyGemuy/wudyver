import crypto from "crypto";
import axios from "axios";
class Infip {
  constructor() {
    this.sid = null;
  }
  log(msg, ...args) {
    console.log(`[log] ${msg}`, ...args);
  }
  fp() {
    const data = {
      screen: "360x806",
      timezone: "Asia/Jakarta",
      language: "id-ID",
      platform: "Linux armv8l",
      cookieEnabled: true,
      doNotTrack: "1",
      hardwareConcurrency: 4,
      deviceMemory: 4
    };
    return Buffer.from(JSON.stringify(data)).toString("base64");
  }
  eph() {
    const ts = Date.now();
    const seq = Math.floor(Math.random() * 1e6);
    const et = Math.random().toString(36).slice(2, 15);
    const micro = Date.now() + Math.random();
    const str = JSON.stringify({
      ts: ts,
      seq: seq,
      et: et,
      micro: micro
    });
    let hash = crypto.createHash("sha256").update(str).digest();
    hash = crypto.createHash("sha256").update(hash).digest();
    const hex = hash.toString("hex");
    const u = hex.slice(0, 16);
    const h = (43981 ^ seq).toString(16);
    const token = `eph_${ts}_${h}_${u}`;
    this.log("Ephemeral:", token);
    return token;
  }
  token() {
    const obj = {
      t: Date.now(),
      r: Math.random().toString(36).slice(2),
      u: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36".slice(0, 20),
      s: "360x806",
      v: "1.0"
    };
    const tok = Buffer.from(JSON.stringify(obj)).toString("base64");
    this.log("Token:", tok);
    return tok;
  }
  genSid() {
    if (!this.sid) {
      this.sid = `${Date.now().toString(16)}${crypto.randomBytes(16).toString("hex")}`;
    }
    this.log("Session ID:", this.sid);
    return this.sid;
  }
  chall(ts, nonce) {
    const sum = [...nonce].reduce((a, c) => a + c.charCodeAt(0), 0);
    const val = (7 * (ts % 1e3 + sum % 100) + 13) % 997;
    this.log("Challenge:", val);
    return val;
  }
  sort(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(v => this.sort(v));
    return Object.fromEntries(Object.keys(obj).sort().map(k => [k, this.sort(obj[k])]));
  }
  hash(data) {
    const temp = {
      ...data
    };
    delete temp._signature;
    const str = JSON.stringify(this.sort(temp));
    return crypto.createHash("sha256").update(str).digest("hex");
  }
  rid() {
    const id = `req_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
    this.log("Request ID:", id);
    return id;
  }
  async sign(data) {
    const ts = Date.now();
    const rid = this.rid();
    const hash = this.hash(data);
    const sig = crypto.createHash("sha256").update(`${hash}:${ts}:${rid}`).digest("hex").slice(0, 32);
    this.log("Payload signed");
    return {
      ...data,
      _signature: {
        signature: sig,
        timestamp: ts,
        requestId: rid,
        payloadHash: hash
      }
    };
  }
  async sig(ts, nonce, ct, sid, chall, eph) {
    const raw = `${ts}:${nonce}:${ct}:${this.fp()}:${sid}:${chall}:${eph}`;
    const hex = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
    this.log("Signature:", hex);
    return hex;
  }
  async chat(data = {}) {
    const {
      prompt = "A medieval castle hidden armory behind altar",
        model = "flux-1-1-pro",
        num_images = 1,
        aspect_ratio = "1:1"
    } = data;
    const payload = {
      prompt: prompt,
      model: model,
      num_images: num_images,
      aspect_ratio: aspect_ratio
    };
    this.log("Chat started with payload:", payload);
    try {
      const ts = Date.now();
      const nonce = Math.random().toString(36).slice(2);
      const ct = this.token();
      const sid = this.genSid();
      const eph = this.eph();
      const chall = this.chall(ts, nonce);
      const xsig = await this.sig(ts, nonce, ct, sid, chall, eph);
      const signed = await this.sign(payload);
      this.log("Sending...");
      const res = await axios.post("https://chat.infip.pro/api/proxy", signed, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          "Content-Type": "application/json",
          "x-signature": xsig,
          "x-browser-fingerprint": this.fp(),
          "x-challenge-response": chall.toString(),
          "x-ephemeral-token": eph,
          "x-client-token": ct,
          "x-timestamp": ts.toString(),
          "x-session-id": sid,
          "x-nonce": nonce,
          origin: "https://chat.infip.pro",
          referer: "https://chat.infip.pro/"
        }
      });
      this.log("Response OK");
      return res.data;
    } catch (err) {
      this.log("❌ Error:", err.message || err);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const client = new Infip();
  try {
    const data = await client.chat(params);
    const base64String = data?.image_urls?.[0];
    if (base64String) {
      const base64Data = base64String.split(";base64,").pop();
      const imageBuffer = Buffer.from(base64Data, "base64");
      res.setHeader("Content-Type", "image/jpeg");
      return res.send(imageBuffer);
    }
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}