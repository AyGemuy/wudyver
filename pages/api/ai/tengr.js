import axios from "axios";
import WebSocket from "ws";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import CryptoJS from "crypto-js";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class TengrAI {
  constructor() {
    this.jar = new CookieJar();
    this.ax = wrapper(axios.create({
      jar: this.jar,
      timeout: 12e4,
      validateStatus: () => true
    }));
    this.apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyaW5kZG5zaXJrc2V5emlkcmx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc2NzI2NTksImV4cCI6MjAzMzI0ODY1OX0.UF0LoflQjW-xVMHiz7Yrvg2wOZzdgVJKivBvnJlcjFQ";
    this.wsKey = "060875315f23db7deeb9";
    this.token = null;
    this.userId = null;
    this.email = null;
    this.authData = null;
  }
  log(msg, data) {
    console.log(msg);
    if (data) console.log("📊 Data:", JSON.stringify(data, null, 2).substring(0, 500));
  }
  genPkce() {
    const v = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Base64url);
    const c = CryptoJS.SHA256(v).toString(CryptoJS.enc.Base64url);
    return {
      verifier: v,
      challenge: c
    };
  }
  genPwd() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let r = "P@5sword";
    for (let i = 0; i < 7; i++) r += chars[Math.floor(Math.random() * chars.length)];
    return r;
  }
  getAuthCookie() {
    return `sb-qrinddnsirkseyzidrlv-auth-token=base64-${Buffer.from(JSON.stringify(this.authData)).toString("base64")}`;
  }
  async createMail() {
    try {
      console.log("📧 Creating temp email...");
      const {
        data,
        status
      } = await this.ax.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      this.log(`✅ Mail API response (${status}):`, data);
      this.email = data?.email;
      console.log(`✅ Email created: ${this.email}`);
      return this.email;
    } catch (e) {
      console.error("❌ Mail creation failed:", e.message);
      throw e;
    }
  }
  async getOtp() {
    try {
      console.log("🔍 Checking OTP...");
      for (let i = 0; i < 60; i++) {
        const {
          data,
          status
        } = await this.ax.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${this.email}`);
        if (i === 0) this.log(`📬 Mail check response (${status}):`, data);
        const msg = data?.data?.[0]?.text_content;
        if (msg) {
          const m = msg.match(/verify\?token=([^&\s)]+)/);
          if (m) {
            console.log("✅ OTP link found");
            this.log("🔗 Verify URL:", `https://qrinddnsirkseyzidrlv.supabase.co/auth/v1/verify?token=${m[1]}&type=signup&redirect_to=https://tengr.ai/api/auth/callback?redirect=/en`);
            return m[1];
          }
        }
        await new Promise(r => setTimeout(r, 3e3));
      }
      throw new Error("OTP timeout");
    } catch (e) {
      console.error("❌ OTP check failed:", e.message);
      throw e;
    }
  }
  async initUser() {
    try {
      console.log("🔧 Initializing user...");
      const headers = {
        cookie: this.getAuthCookie(),
        accept: "*/*",
        referer: "https://tengr.ai/en",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      const r1 = await this.ax.get("https://tengr.ai/api/user", {
        headers: headers
      });
      this.log(`👤 User API (${r1.status}):`, r1.data);
      if (r1.status >= 400) throw new Error(`User API failed: ${r1.status}`);
      if (r1.data?.id) {
        this.userId = r1.data.id;
        this.log("👤 Tengr.ai User ID:", this.userId);
      }
      await new Promise(r => setTimeout(r, 500));
      const r2 = await this.ax.get("https://tengr.ai/api/user/credits", {
        headers: headers
      });
      this.log(`💰 Credits API (${r2.status}):`, r2.data);
      if (r2.status >= 400) throw new Error(`Credits API failed: ${r2.status}`);
      await new Promise(r => setTimeout(r, 500));
      const r3 = await this.ax.get("https://tengr.ai/api/user/stats", {
        headers: headers
      });
      this.log(`📈 Stats API (${r3.status}):`, r3.data);
      if (r3.status >= 400) throw new Error(`Stats API failed: ${r3.status}`);
      console.log("✅ User initialized");
      return true;
    } catch (e) {
      console.error("❌ User init failed:", e.message);
      throw e;
    }
  }
  async asyncSignup() {
    try {
      const pkce = this.genPkce();
      const pwd = this.genPwd();
      console.log("📝 Signing up...");
      const signupRes = await this.ax.post("https://qrinddnsirkseyzidrlv.supabase.co/auth/v1/signup?redirect_to=https%3A%2F%2Ftengr.ai%2Fapi%2Fauth%2Fcallback%3Fredirect%3D%2Fen", {
        email: this.email,
        password: pwd,
        data: {},
        gotrue_meta_security: {},
        code_challenge: pkce.challenge,
        code_challenge_method: "s256"
      }, {
        headers: {
          apikey: this.apiKey,
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
          origin: "https://tengr.ai",
          referer: "https://tengr.ai/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this.log(`📤 Signup response (${signupRes.status}):`, signupRes.data);
      if (signupRes.status >= 400) throw new Error(`Signup failed: ${signupRes.status}`);
      console.log("⏳ Waiting for confirmation email...");
      const otp = await this.getOtp();
      console.log("✉️ Confirming email (step 1: verify)...");
      const verifyRes = await this.ax.get(`https://qrinddnsirkseyzidrlv.supabase.co/auth/v1/verify?token=${otp}&type=signup&redirect_to=https%3A%2F%2Ftengr.ai%2Fapi%2Fauth%2Fcallback%3Fredirect%3D%2Fen`, {
        headers: {
          apikey: this.apiKey,
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        },
        maxRedirects: 0
      });
      this.log(`📧 Verify response (${verifyRes.status}):`, {
        headers: verifyRes.headers,
        data: verifyRes.data
      });
      const redirectUrl = verifyRes.headers?.location || verifyRes.data?.redirect_to;
      if (!redirectUrl) throw new Error("No redirect URL found");
      const redirectUrlObj = new URL(redirectUrl);
      const code = redirectUrlObj.searchParams.get("code");
      if (!code) throw new Error("No code in redirect URL");
      console.log("✉️ Confirming email (step 2: exchange code)...");
      this.log("🔑 Authorization code:", code);
      const tokenRes = await this.ax.post("https://qrinddnsirkseyzidrlv.supabase.co/auth/v1/token?grant_type=pkce", {
        auth_code: code,
        code_verifier: pkce.verifier
      }, {
        headers: {
          apikey: this.apiKey,
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this.log(`🔄 Token exchange (${tokenRes.status}):`, tokenRes.data);
      if (tokenRes.status >= 400) throw new Error(`Token exchange failed: ${tokenRes.status}`);
      const accessToken = tokenRes.data?.access_token;
      const refreshToken = tokenRes.data?.refresh_token;
      if (!accessToken) throw new Error("No access token in response");
      console.log("✅ Token exchanged successfully");
      this.authData = {
        access_token: accessToken,
        token_type: tokenRes.data?.token_type || "bearer",
        expires_in: tokenRes.data?.expires_in || 3600,
        expires_at: Date.now() + (tokenRes.data?.expires_in || 3600) * 1e3,
        refresh_token: refreshToken,
        user: tokenRes.data?.user
      };
      const cookieStr = `sb-qrinddnsirkseyzidrlv-auth-token=base64-${Buffer.from(JSON.stringify(this.authData)).toString("base64")}`;
      await this.jar.setCookie(cookieStr, "https://tengr.ai");
      this.log("🍪 Auth cookie set:", cookieStr.substring(0, 100) + "...");
      this.token = this.authData.access_token;
      this.userId = this.authData?.user?.id;
      console.log("✅ Signup complete");
      this.log("🔑 Token:", this.token.substring(0, 30) + "...");
      this.log("👤 User ID:", this.userId);
      await new Promise(r => setTimeout(r, 1e3));
      await this.initUser();
      return {
        token: this.token,
        userId: this.userId
      };
    } catch (e) {
      console.error("❌ Signup failed:", e.message);
      if (e.response) this.log("❌ Error response:", e.response.data);
      throw e;
    }
  }
  async ensureToken(t) {
    if (t) {
      this.token = t;
      this.authData = this.authData || {
        access_token: t,
        token_type: "bearer"
      };
      return t;
    }
    if (!this.token) {
      await this.createMail();
      await this.asyncSignup();
    }
    return this.token;
  }
  async getCredits() {
    try {
      const {
        data,
        status
      } = await this.ax.get("https://tengr.ai/api/user/credits", {
        headers: {
          cookie: this.getAuthCookie(),
          referer: "https://tengr.ai/en/dashboard"
        }
      });
      this.log(`💰 Credits (${status}):`, data);
      console.log(`💰 Credits: ${data?.tengraiCredit || 0}`);
      return data;
    } catch (e) {
      console.error("❌ Credit check failed:", e.message);
      return null;
    }
  }
  async uploadImg(img) {
    try {
      console.log("📤 Uploading image...");
      const {
        data: sig,
        status: s1
      } = await this.ax.get("https://tengr.ai/api/image-ai/transloadit/signature", {
        headers: {
          cookie: this.getAuthCookie(),
          "content-type": "application/json",
          referer: "https://tengr.ai/en"
        }
      });
      this.log(`🔑 Signature (${s1}):`, sig);
      if (s1 >= 400) throw new Error(`Signature failed: ${s1}`);
      const fd = new FormData();
      let buf;
      if (Buffer.isBuffer(img)) {
        buf = img;
      } else if (typeof img === "string") {
        if (img.startsWith("data:")) {
          buf = Buffer.from(img.split(",")[1], "base64");
        } else if (img.startsWith("http")) {
          const {
            data
          } = await this.ax.get(img, {
            responseType: "arraybuffer"
          });
          buf = data;
        } else {
          throw new Error("String must be URL or base64");
        }
      } else {
        throw new Error("Image must be Buffer, URL string, or base64 string");
      }
      fd.append("file", buf, "img.jpg");
      fd.append("params", sig.params);
      fd.append("signature", sig.signature);
      const {
        data: up,
        status: s2
      } = await this.ax.post("https://api2.transloadit.com/assemblies", fd, {
        headers: {
          ...fd.getHeaders(),
          origin: "https://tengr.ai",
          referer: "https://tengr.ai/"
        }
      });
      this.log(`📤 Upload started (${s2}):`, {
        assembly_id: up?.assembly_id,
        ok: up?.ok
      });
      if (s2 >= 400) throw new Error(`Upload failed: ${s2}`);
      const url = up?.assembly_ssl_url;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 1e3));
        const {
          data: st
        } = await this.ax.get(url, {
          headers: {
            origin: "https://tengr.ai",
            referer: "https://tengr.ai/"
          }
        });
        if (i % 5 === 0) console.log(`⏳ Upload progress: ${st?.ok}`);
        if (st?.ok === "ASSEMBLY_COMPLETED") {
          const u = st?.results?.webp_converted?.[0]?.ssl_url;
          console.log("✅ Upload complete");
          this.log("🖼️ Image URL:", u);
          return u;
        }
      }
      throw new Error("Upload timeout");
    } catch (e) {
      console.error("❌ Upload failed:", e.message);
      throw e;
    }
  }
  genWebId() {
    const adj = ["late", "common", "rich", "brown", "some", "soft", "true", "curvy", "breezy", "afraid"];
    const noun = ["bars", "pianos", "results", "houses", "ears", "build", "hope", "warn", "walk", "fix"];
    const verb = ["politely", "freely", "slowly", "brightly", "knowingly"];
    const r = () => Math.floor(Math.random() * 10);
    return `${adj[r()]}-${adj[r()]}-${noun[r()]}-${verb[Math.floor(Math.random() * 5)]}-${verb[Math.floor(Math.random() * 5)]}`;
  }
  async createTask(p) {
    try {
      const imgs = p.imageUrl ? Array.isArray(p.imageUrl) ? p.imageUrl : [p.imageUrl] : [];
      const urls = [];
      for (const img of imgs) {
        const u = await this.uploadImg(img);
        urls.push(u);
      }
      const hasImages = urls.length > 0;
      const artworkType = p.artworkType || (hasImages ? 13 : 7);
      const webId = p.webId || this.genWebId();
      const body = {
        width: p.width || 1024,
        height: p.height || 1024,
        artworkType: artworkType,
        styleId: p.styleId || 78e3,
        creativity: p.creativity !== undefined ? p.creativity : 3,
        detail: p.detail !== undefined ? p.detail : 1,
        webId: webId,
        seamless: p.seamless !== undefined ? p.seamless : false,
        transparentBackground: p.transparentBackground !== undefined ? p.transparentBackground : false,
        prompt: p.prompt || "",
        negativePrompt: p.negativePrompt || "",
        promptImprove: p.promptImprove !== undefined ? p.promptImprove : false
      };
      if (hasImages) {
        body.sourceImages = urls;
      }
      if (artworkType === 9) {
        body.photoPilot = {
          lora: p.photoPilot?.lora !== undefined ? p.photoPilot.lora : 3,
          creativity: p.photoPilot?.creativity !== undefined ? p.photoPilot.creativity : 5,
          denoise: p.photoPilot?.denoise !== undefined ? p.photoPilot.denoise : 5,
          imageGuidance: p.photoPilot?.imageGuidance !== undefined ? p.photoPilot.imageGuidance : 2,
          imageWidth: p.photoPilot?.imageWidth || p.width || 640,
          imageHeight: p.photoPilot?.imageHeight || p.height || 640
        };
      }
      if (artworkType === 13 && hasImages) {
        body.denoising = p.denoising !== undefined ? p.denoising : 3;
        body.useImageAs = p.useImageAs !== undefined ? p.useImageAs : 3;
        body.inputImageInfluence = p.inputImageInfluence !== undefined ? p.inputImageInfluence : 3;
      }
      console.log("🎨 Creating task...");
      this.log("📋 Payload:", body);
      const {
        data,
        status
      } = await this.ax.post("https://tengr.ai/api/image-ai", body, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          cookie: this.getAuthCookie(),
          "content-type": "text/plain;charset=UTF-8",
          origin: "https://tengr.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: `https://tengr.ai/en/generate?id=${webId}`,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this.log(`🎨 Task response (${status}):`, data);
      if (status >= 400) throw new Error(`Task creation failed: ${status} - ${JSON.stringify(data)}`);
      console.log("✅ Task created");
      return data;
    } catch (e) {
      console.error("❌ Task creation failed:", e.message);
      throw e;
    }
  }
  async pollWs(uid) {
    return new Promise((res, rej) => {
      try {
        const userId = uid || this.userId;
        if (!userId) {
          rej(new Error("No userId available for WebSocket"));
          return;
        }
        console.log("🔌 Connecting to WebSocket...");
        this.log("📡 Using userId for channel:", userId);
        const ws = new WebSocket(`wss://ws-eu.pusher.com/app/${this.wsKey}?protocol=7&client=js&version=8.4.0-rc2`, {
          headers: {
            Origin: "https://tengr.ai",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
          }
        });
        let to = setTimeout(() => {
          ws.close();
          rej(new Error("WS timeout"));
        }, 12e4);
        ws.on("open", () => {
          console.log("✅ WebSocket connected");
        });
        ws.on("message", d => {
          const msg = JSON.parse(d.toString());
          console.log("📨 WS event:", msg.event);
          if (msg.event === "pusher:connection_established") {
            const channel = `tengrai-artworks-v2-channel-user-${userId}`;
            console.log("📡 Subscribing to:", channel);
            ws.send(JSON.stringify({
              event: "pusher:subscribe",
              data: {
                auth: "",
                channel: channel
              }
            }));
          }
          if (msg.event === "pusher_internal:subscription_succeeded") {
            console.log("✅ Subscribed, waiting for generation...");
          }
          if (msg.event === "artwork-generated") {
            const dt = JSON.parse(msg.data);
            const tasks = dt?.tasks || [];
            const allDone = tasks.every(t => t.status === "done");
            const pendingTasks = tasks.filter(t => t.status !== "done").length;
            if (allDone) {
              clearTimeout(to);
              const imgs = tasks.flatMap(t => t.images || []);
              console.log(`✅ Generated ${imgs.length} images`);
              this.log("🖼️ Images:", imgs);
              ws.close();
              res({
                images: imgs,
                tasks: tasks,
                webId: dt.webId
              });
            } else {
              console.log(`⏳ Waiting... ${pendingTasks} task(s) still pending`);
            }
          }
        });
        ws.on("error", e => {
          clearTimeout(to);
          console.error("❌ WS error:", e.message);
          rej(e);
        });
      } catch (e) {
        rej(e);
      }
    });
  }
  async generate({
    token,
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      await this.ensureToken(token);
      const task = await this.createTask({
        prompt: prompt,
        imageUrl: imageUrl,
        ...rest
      });
      const userId = task.userId || this.userId;
      this.log("🔍 Using userId for polling:", userId);
      const result = await this.pollWs(userId);
      return {
        result: result.images,
        token: this.token,
        userId: this.userId,
        webId: task.webId,
        taskId: task.id,
        ...result
      };
    } catch (e) {
      console.error("❌ Generation failed:", e.message);
      throw e;
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
  const api = new TengrAI();
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