import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
const err = (msg, field, val) => {
  const e = new Error(msg);
  e.name = "ValidationError";
  e.field = field;
  e.value = val;
  return e;
};
const V = {
  str: (v, f, opt = {}) => {
    const {
      min = 1,
        max = null,
        req = true
    } = opt;
    if (req && (v === undefined || v === null || v === "")) throw err(`${f} required`, f, v);
    if (v && typeof v !== "string") throw err(`${f} must be string`, f, v);
    if (v) {
      const t = v.trim();
      if (t.length < min) throw err(`${f} must be at least ${min} characters`, f, v);
      if (max && t.length > max) throw err(`${f} must be at most ${max} characters`, f, v);
      return t;
    }
    return v;
  },
  num: (v, f, opt = {}) => {
    const {
      min = null,
        max = null,
        req = true
    } = opt;
    if (req && (v === undefined || v === null || v === "")) throw err(`${f} required`, f, v);
    if (v !== undefined && v !== null && v !== "") {
      const n = Number(v);
      if (isNaN(n)) throw err(`${f} must be a number`, f, v);
      if (min !== null && n < min) throw err(`${f} must be at least ${min}`, f, v);
      if (max !== null && n > max) throw err(`${f} must be at most ${max}`, f, v);
      return n;
    }
    return v;
  },
  enm: (v, f, opt = {}) => {
    const {
      allowed,
      req = true
    } = opt;
    if (req && (v === undefined || v === null || v === "")) throw err(`${f} required`, f, v);
    if (v && Array.isArray(allowed)) {
      if (!allowed.includes(v)) throw err(`${f} must be one of: ${allowed.join(", ")}`, f, v);
    } else if (v) {
      console.warn(`Validator config warning for ${f}: 'allowed' array missing or invalid in V.enm.`);
    }
    return v;
  },
  bool: (v, f, opt = {}) => {
    if (v === undefined || v === null) return opt.default !== undefined ? opt.default : false;
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const lower = v.toLowerCase();
      if (lower === "true" || lower === "1") return true;
      if (lower === "false" || lower === "0") return false;
    }
    if (typeof v === "number") return v !== 0;
    return !!v;
  },
  img: (v, f, opt = {}) => {
    const {
      req = true
    } = opt;
    if (req && !v) throw err(`${f} required`, f, v);
    if (!v) return null;
    if (v instanceof Buffer) return {
      type: "buffer",
      data: v
    };
    if (typeof v === "string") {
      if (v.startsWith("data:image/")) return {
        type: "base64",
        data: v
      };
      if (v.startsWith("http://") || v.startsWith("https://")) {
        try {
          new URL(v);
          return {
            type: "url",
            data: v
          };
        } catch {
          throw err(`${f} invalid URL`, f, v);
        }
      }
      return {
        type: "path",
        data: v
      };
    }
    throw err(`${f} must be a Buffer, base64 string, URL, or file path`, f, v);
  }
};
const validate = (data, rules) => {
  const errors = [],
    validated = {};
  for (const [field, rule] of Object.entries(rules)) {
    try {
      if (rule.v) {
        validated[field] = rule.v(data[field], field, rule.o);
      } else {
        validated[field] = data[field];
      }
    } catch (e) {
      errors.push(e.name === "ValidationError" ? e : err(`Validation failed: ${field}`, field, data[field]));
    }
  }
  if (errors.length > 0) {
    const e = new Error("Validation failed");
    e.name = "ValidationFailed";
    e.errors = errors;
    throw e;
  }
  return validated;
};
const S = {
  register: {},
  credits: {
    key: {
      v: V.str,
      o: {
        req: false,
        min: 1,
        max: 100
      }
    }
  },
  uploadImage: {
    key: {
      v: V.str,
      o: {
        req: false,
        min: 1,
        max: 100
      }
    },
    imageInput: {
      v: V.img,
      o: {
        req: true
      }
    },
    imageType: {
      v: V.enm,
      o: {
        allowed: ["webp", "png", "jpg", "jpeg"],
        req: true
      }
    }
  },
  generateVideo: {
    key: {
      v: V.str,
      o: {
        req: false,
        min: 1,
        max: 100
      }
    },
    prompt: {
      v: V.str,
      o: {
        req: true,
        min: 1,
        max: 1e3
      }
    },
    ratio: {
      v: V.enm,
      o: {
        req: false,
        allowed: ["16:9", "9:16", "1:1", "4:3", "3:4"]
      }
    },
    duration: {
      v: V.num,
      o: {
        req: false,
        min: 1,
        max: 60
      }
    },
    quality: {
      v: V.enm,
      o: {
        req: false,
        allowed: ["360p", "480p", "540p", "720p", "1080p"]
      }
    },
    model: {
      v: V.enm,
      o: {
        req: false,
        allowed: ["pixverse", "pixverse-token", "veo3", "wan25", "sora2", "fast"]
      }
    },
    imageUrl: {
      v: V.str,
      o: {
        req: false,
        min: 1,
        max: 1e3
      }
    },
    ispublic: {
      v: V.bool,
      o: {
        req: false,
        default: false
      }
    }
  },
  videoStatus: {
    key: {
      v: V.str,
      o: {
        req: false,
        min: 1,
        max: 100
      }
    },
    taskId: {
      v: V.str,
      o: {
        req: true,
        min: 1,
        max: 100
      }
    },
    model: {
      v: V.enm,
      o: {
        req: false,
        allowed: ["pixverse", "pixverse-token", "veo3", "wan25", "sora2", "fast"]
      }
    },
    ispublic: {
      v: V.bool,
      o: {
        req: false,
        default: false
      }
    },
    quality: {
      v: V.str,
      o: {
        req: false,
        min: 1,
        max: 10
      }
    },
    ratio: {
      v: V.str,
      o: {
        req: false,
        min: 1,
        max: 10
      }
    },
    prompt: {
      v: V.str,
      o: {
        req: false,
        min: 1,
        max: 1e3
      }
    }
  },
  sessionHealth: {
    key: {
      v: V.str,
      o: {
        req: false,
        min: 1,
        max: 100
      }
    }
  },
  deleteKey: {
    key: {
      v: V.str,
      o: {
        req: true,
        min: 1,
        max: 100
      }
    }
  }
};
const MODELS = {
  pixverse: {
    gen: "pixverse/gen",
    get: "pixverse/get"
  },
  "pixverse-token": {
    gen: "pixverse-token/gen",
    get: "pixverse-token/get"
  },
  veo3: {
    gen: "veo3/gen",
    get: "veo3/get"
  },
  wan25: {
    gen: "wavespeed/wan25/gen",
    get: "wavespeed/wan25/get"
  },
  sora2: {
    gen: "kei/sora2/gen",
    get: "kei/sora2/get"
  },
  fast: {
    gen: "kei/sora2/gen",
    get: "kei/sora2/get"
  }
};
const b64dec = e => {
  const l = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let h = "",
    c = 0;
  e = e.replace(/-/g, "+").replace(/_/g, "/");
  while (c < e.length) {
    const i = l.indexOf(e.charAt(c++)),
      n = l.indexOf(e.charAt(c++));
    const a = l.indexOf(e.charAt(c++)),
      o = l.indexOf(e.charAt(c++));
    const t = i << 2 | n >> 4,
      r = (15 & n) << 4 | a >> 2,
      s = (3 & a) << 6 | o;
    h += String.fromCharCode(t);
    if (64 != a && 0 != r) h += String.fromCharCode(r);
    if (64 != o && 0 != s) h += String.fromCharCode(s);
  }
  return h;
};
const jwtDec = e => {
  const t = e.split(".");
  if (3 !== t.length) throw Error("Invalid JWT");
  return JSON.parse(b64dec(t[1]));
};
const genVerifier = () => {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const e = new Uint32Array(56);
    crypto.getRandomValues(e);
    return Array.from(e, e => ("0" + e.toString(16)).substr(-2)).join("");
  }
  const e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let r = "";
  for (let s = 0; s < 56; s++) r += e.charAt(Math.floor(Math.random() * e.length));
  return r;
};
const sha256 = async e => {
  const r = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(e));
  return Array.from(new Uint8Array(r)).map(e => String.fromCharCode(e)).join("");
};
const b64enc = e => {
  if (typeof btoa !== "undefined") return btoa(e).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return Buffer.from(e).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const genChallenge = async e => {
  if (typeof crypto === "undefined" || !crypto.subtle) return e;
  return b64enc(await sha256(e));
};
const genPKCE = async () => {
  const verifier = genVerifier();
  const challenge = await genChallenge(verifier);
  return {
    verifier: verifier,
    challenge: challenge,
    method: verifier === challenge ? "plain" : "s256"
  };
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
class Wudy {
  constructor() {
    this.c = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api`
    });
  }
  async createEmail() {
    const {
      data
    } = await this.c.get("/mails/v9", {
      params: {
        action: "create"
      }
    });
    console.log(data?.email);
    return data?.email;
  }
  async checkMsg(email) {
    try {
      const {
        data
      } = await this.c.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const msgs = data?.data || [];
      if (msgs.length > 0) {
        const m = msgs[0].html_content.match(/href="([^"]*resend-links\.com[^"]*)"/);
        console.log(m);
        return m ? m[1] : null;
      }
      return null;
    } catch {
      return null;
    }
  }
  async createPaste(title, content) {
    const {
      data
    } = await this.c.get("/tools/paste/v1", {
      params: {
        action: "create",
        title: title,
        content: content
      }
    });
    return data?.key || null;
  }
  async getPaste(key) {
    const {
      data
    } = await this.c.get("/tools/paste/v1", {
      params: {
        action: "get",
        key: key
      }
    });
    return data?.content || null;
  }
  async listPastes() {
    const {
      data
    } = await this.c.get("/tools/paste/v1", {
      params: {
        action: "list"
      }
    });
    return data || [];
  }
  async delPaste(key) {
    const {
      data
    } = await this.c.get("/tools/paste/v1", {
      params: {
        action: "delete",
        key: key
      }
    });
    return data || null;
  }
}
class Sora2AI {
  constructor() {
    this.jar = new CookieJar();
    this.skey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHZjd3dtY2ZoZnNmemJxd3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjEyODcsImV4cCI6MjA3NDg5NzI4N30.pS8v_hxE8KelayuViAlLCFb65rdKBmn8mSzpUu5f_Ss";
    const h = {
      "accept-language": "id-ID",
      "sec-ch-ua": '"Chromium";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      ...SpoofHead()
    };
    this.api = wrapper(axios.create({
      baseURL: "https://sora2ai.io/api",
      jar: this.jar,
      withCredentials: true,
      headers: {
        ...h,
        accept: "application/json",
        "content-type": "application/json",
        origin: "https://sora2ai.io"
      }
    }));
    this.supa = wrapper(axios.create({
      baseURL: "https://jnhvcwwmcfhfsfzbqwyp.supabase.co/auth/v1",
      jar: this.jar,
      withCredentials: true,
      headers: {
        ...h,
        apikey: this.skey,
        authorization: `Bearer ${this.skey}`,
        "content-type": "application/json;charset=UTF-8"
      }
    }));
    this.browser = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      maxRedirects: 0,
      validateStatus: s => s >= 200 && s < 400,
      headers: {
        ...h,
        accept: "text/html,application/xhtml+xml"
      }
    }));
    this.w = new Wudy();
  }
  rand() {
    return Math.random().toString(36).substring(2, 12);
  }
  async getToken(key) {
    try {
      console.log(`🔑 Getting token for key: ${key}`);
      const saved = await this.w.getPaste(key);
      if (!saved) throw new Error(`Session "${key}" not found`);
      const session = JSON.parse(saved);
      if (!session.access_token) throw new Error("Invalid token");
      console.log(`✅ Token retrieved successfully`);
      return session;
    } catch (error) {
      console.error(`❌ Get token error:`, error.message);
      throw error;
    }
  }
  async extractToken() {
    try {
      console.log(`🍪 Extracting token from cookies...`);
      const cookies = await this.jar.getCookies("https://sora2ai.io");
      const auth = cookies.find(c => c.key.startsWith("sb-") && c.key.includes("-auth-token"));
      if (!auth?.value) {
        console.log(`⚠️ No auth cookie found`);
        return null;
      }
      try {
        let val = auth.value;
        if (val.startsWith("%5B%22") || val.startsWith('["')) {
          if (val.includes("%")) val = decodeURIComponent(val);
          const arr = JSON.parse(val);
          if (arr[0]?.startsWith("eyJ")) {
            console.log(`✅ Token extracted (array format)`);
            return {
              access_token: arr[0],
              refresh_token: arr[1],
              expires_at: arr[2],
              token_type: "bearer",
              user: jwtDec(arr[0])
            };
          }
        }
        if (val.startsWith("base64-")) {
          const session = JSON.parse(Buffer.from(val.replace("base64-", ""), "base64").toString());
          if (session.access_token) {
            session.user = jwtDec(session.access_token);
            console.log(`✅ Token extracted (base64 format)`);
            return session;
          }
        }
      } catch (e) {
        console.error(`❌ Token parse error:`, e.message);
      }
      return null;
    } catch (error) {
      console.error(`❌ Extract token error:`, error.message);
      return null;
    }
  }
  async followRedirects(url) {
    try {
      console.log(`🔗 Following redirects from: ${url}`);
      let curr = url,
        count = 0;
      while (count < 10) {
        try {
          const res = await this.browser.get(curr);
          if (res.status >= 300 && res.status < 400) {
            curr = new URL(res.headers.location, curr).href;
            console.log(`  ↪️ Redirect ${count + 1}: ${curr}`);
            count++;
          } else {
            console.log(`✅ Final URL reached: ${curr}`);
            return curr;
          }
        } catch (e) {
          if (e.response?.status >= 300 && e.response?.status < 400) {
            curr = new URL(e.response.headers.location, curr).href;
            console.log(`  ↪️ Redirect ${count + 1}: ${curr}`);
            count++;
          } else throw e;
        }
      }
      console.log(`⚠️ Max redirects reached`);
      return curr;
    } catch (error) {
      console.error(`❌ Follow redirects error:`, error.message);
      throw error;
    }
  }
  async completeAuth() {
    try {
      console.log(`🔐 Completing authentication...`);
      await this.browser.get("https://sora2ai.io/id/dashboard");
      try {
        await this.api.post("/user-utm-tracker", {
          utmSource: "",
          utmMedium: "",
          utmCampaign: "",
          deviceInfo: "mobile",
          referrer: "https://www.google.com/"
        });
        console.log(`✅ UTM tracker updated`);
      } catch (e) {
        console.log(`⚠️ UTM tracker failed (non-critical):`, e.message);
      }
      console.log(`✅ Authentication completed`);
      return true;
    } catch (error) {
      console.error(`❌ Complete auth error:`, error.message);
      throw error;
    }
  }
  async pollToken(max = 30, int = 1e3) {
    try {
      console.log(`⏳ Polling for token (max ${max} attempts)...`);
      for (let i = 0; i < max; i++) {
        console.log(`  🔄 Attempt ${i + 1}/${max}`);
        const session = await this.extractToken();
        if (session?.access_token) {
          console.log(`✅ Token found!`);
          await this.completeAuth();
          return session;
        }
        if (i < max - 1) await sleep(int);
      }
      throw new Error("Token timeout");
    } catch (error) {
      console.error(`❌ Poll token error:`, error.message);
      throw error;
    }
  }
  async waitLink(email, max = 60, int = 3e3) {
    try {
      console.log(`📧 Waiting for verification link (max ${max} attempts)...`);
      for (let i = 0; i < max; i++) {
        console.log(`  🔄 Checking email ${i + 1}/${max}`);
        const link = await this.w.checkMsg(email);
        if (link) {
          console.log(`✅ Verification link received!`);
          return link;
        }
        if (i < max - 1) await sleep(int);
      }
      throw new Error("Link timeout");
    } catch (error) {
      console.error(`❌ Wait link error:`, error.message);
      throw error;
    }
  }
  async performReg() {
    try {
      console.log(`\n🚀 Starting registration process...`);
      console.log(`📧 Creating temporary email...`);
      const email = await this.w.createEmail();
      if (!email) throw new Error("Email failed");
      console.log(`✅ Email created: ${email}`);
      console.log(`🔒 Generating PKCE credentials...`);
      const {
        verifier,
        challenge,
        method
      } = await genPKCE();
      await this.jar.setCookie(`sb-jnhvcwwmcfhfsfzbqwyp-auth-token-code-verifier=${verifier}; Path=/; Secure`, "https://sora2ai.io");
      console.log(`✅ PKCE generated (method: ${method})`);
      console.log(`📤 Sending OTP request...`);
      await this.supa.post("/otp?redirect_to=https%3A%2F%2Fsora2ai.io%2Fapi%2Fauth%2Fcallback%3Ffrom%3D%2Fid%2Fdashboard", {
        email: email,
        data: {},
        create_user: true,
        gotrue_meta_security: {},
        code_challenge: challenge,
        code_challenge_method: method
      });
      console.log(`✅ OTP sent to ${email}`);
      const link = await this.waitLink(email);
      console.log(`🔗 Processing verification link...`);
      await this.followRedirects(link);
      const session = await this.pollToken();
      console.log(`✅ Registration completed successfully!`);
      return {
        ...session,
        email: email
      };
    } catch (error) {
      console.error(`❌ Registration error:`, error.message);
      throw error;
    }
  }
  async register(data = {}) {
    try {
      console.log(`\n📝 Register - Validating input...`);
      validate(data, S.register);
      const session = await this.performReg();
      console.log(`💾 Saving session to paste...`);
      const toSave = JSON.stringify({
        access_token: session.access_token,
        email: session.email,
        expires_at: session.expires_at,
        refresh_token: session.refresh_token,
        user: session.user
      });
      const key = await this.w.createPaste(`sora2ai-session-${this.rand()}`, toSave);
      if (!key) throw new Error("Save failed");
      console.log(`✅ Session saved with key: ${key}`);
      return {
        key: key,
        email: session.email,
        access_token: session.access_token.substring(0, 50) + "...",
        user_id: session.user?.sub
      };
    } catch (e) {
      console.error(`❌ Register error:`, e.message);
      if (e.name === "ValidationFailed") throw new Error(`Validation: ${e.errors.map(e => e.message).join(", ")}`);
      throw e;
    }
  }
  async ensureSession(data) {
    try {
      console.log(`\nEnsuring session...`);
      let session, currKey = data.key;
      if (data.key) {
        try {
          console.log(`Loading session from key: ${data.key}`);
          session = await this.getToken(data.key);
          await this.jar.setCookie(`sb-jnhvcwwmcfhfsfzbqwyp-auth-token=${JSON.stringify([ session.access_token, session.refresh_token || "", session.expires_at || Math.floor(Date.now() / 1e3) + 3600, null, null ])}; Domain=.sora2ai.io; Path=/; Secure; SameSite=None`, "https://sora2ai.io");
          console.log(`Session loaded from key`);
        } catch (e) {
          console.log(`Failed to load from key (will try others):`, e.message);
          session = null;
        }
      }
      if (!session) {
        console.log(`Extracting session from current cookies...`);
        session = await this.extractToken();
      }
      const validateSession = async sess => {
        try {
          this.api.defaults.headers.common["Authorization"] = `Bearer ${sess.access_token}`;
          console.log(`Validating session by fetching credits...`);
          const creditRes = await this.api.post("/credits", {});
          if (creditRes.data && (creditRes.data.credits !== undefined || creditRes.data.message)) {
            console.log(`Session VALID! Credits: ${creditRes.data.credits ?? "unknown"}`);
            return true;
          }
        } catch (err) {
          console.log(`Session validation failed:`, err.response?.data || err.message);
          delete this.api.defaults.headers.common["Authorization"];
          return false;
        }
        return false;
      };
      if (session) {
        const isValid = await validateSession(session);
        if (isValid) {
          console.log(`Existing session is healthy`);
          return {
            sessionData: session,
            key: currKey || data.key
          };
        } else {
          console.log(`Existing session invalid/expired → will create new one`);
          session = null;
        }
      }
      console.log(`No valid session found → creating new account...`);
      const newSess = await this.register();
      currKey = newSess.key;
      session = await this.getToken(currKey);
      console.log(`New session created, validating credits one more time...`);
      const finalValid = await validateSession(session);
      if (!finalValid) {
        throw new Error("Newly registered session failed credit check – possible rate limit or backend issue");
      }
      console.log(`Session ready & verified with key: ${currKey}`);
      return {
        sessionData: session,
        key: currKey
      };
    } catch (error) {
      console.error(`Ensure session error:`, error.message);
      throw error;
    }
  }
  async img2b64(imgInput) {
    try {
      console.log(`🖼️ Converting image to base64 (type: ${imgInput.type})...`);
      const {
        type,
        data
      } = imgInput;
      if (type === "base64") {
        console.log(`✅ Already base64 format`);
        return data;
      }
      if (type === "buffer") {
        console.log(`✅ Converted from buffer`);
        return `data:image/jpeg;base64,${data.toString("base64")}`;
      }
      if (type === "url") {
        console.log(`📥 Downloading from URL: ${data}`);
        const res = await axios.get(data, {
          responseType: "arraybuffer"
        });
        const contentType = res.headers["content-type"] || "image/jpeg";
        console.log(`✅ Downloaded and converted (${contentType})`);
        return `data:${contentType};base64,${Buffer.from(res.data).toString("base64")}`;
      }
      throw new Error(`Unsupported image type: ${type}`);
    } catch (error) {
      console.error(`❌ Image conversion error:`, error.message);
      throw error;
    }
  }
  async autoUpload(imgInput, type = "webp") {
    try {
      console.log(`📤 Auto-uploading image (type: ${type})...`);
      if (!imgInput) {
        throw new Error("Image input is required");
      }
      const b64 = await this.img2b64(imgInput);
      if (!b64.startsWith("data:image/")) {
        throw new Error("Invalid base64 image data");
      }
      console.log(`Uploading image (size: ${Math.round(b64.length * .75)} bytes)...`);
      const {
        data
      } = await this.api.post("/image/upload/binary", {
        imageSource: b64,
        imageType: type
      });
      if (!data?.url) {
        throw new Error("No URL returned from upload");
      }
      console.log(`✅ Image uploaded successfully: ${data.url}`);
      return data.url;
    } catch (error) {
      console.error(`❌ Auto upload error:`, error.message);
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.statusText;
        throw new Error(`Upload failed (${status}): ${message}`);
      }
      throw error;
    }
  }
  async getCredits(data = {}) {
    try {
      console.log(`\n💰 Get Credits - Starting...`);
      const v = validate(data, S.credits);
      const {
        key
      } = await this.ensureSession(v);
      console.log(`📊 Fetching credits...`);
      const res = await this.api.post("/credits", {});
      console.log(`✅ Credits data:`, res.data);
      return {
        ...res.data,
        key: key
      };
    } catch (e) {
      console.error(`❌ Get credits error:`, e.message);
      if (e.name === "ValidationFailed") throw new Error(`Validation: ${e.errors.map(e => e.message).join(", ")}`);
      throw new Error(e.response?.data?.message || e.message);
    }
  }
  async uploadImage(data = {}) {
    try {
      console.log(`\n🖼️ Upload Image - Starting...`);
      const v = validate(data, S.uploadImage);
      const {
        key
      } = await this.ensureSession(v);
      const b64 = await this.img2b64(v.imageInput);
      console.log(`📤 Uploading to server...`);
      const res = await this.api.post("/image/upload/binary", {
        imageSource: b64,
        imageType: v.imageType
      });
      console.log(`✅ Upload response:`, res.data);
      return {
        ...res.data,
        key: key
      };
    } catch (e) {
      console.error(`❌ Upload image error:`, e.message);
      if (e.name === "ValidationFailed") throw new Error(`Validation: ${e.errors.map(e => e.message).join(", ")}`);
      throw new Error(e.response?.data?.message || e.message);
    }
  }
  async generateVideo(data = {}) {
    try {
      console.log(`\nGenerate Video - Starting...`);
      console.log(`Input:`, JSON.stringify(data, null, 2));
      const input = {
        ...data
      };
      input.model = input.model || "sora2";
      const v = validate(input, S.generateVideo);
      console.log(`Validation OK → model: ${v.model}`);
      const {
        key
      } = await this.ensureSession(v);
      let presignedImageUrl = null;
      if (v.imageUrl) {
        console.log(`Image detected → converting to base64 + presign upload`);
        let imageObj;
        if (typeof v.imageUrl === "object" && v.imageUrl !== null) {
          imageObj = V.img(v.imageUrl, "imageUrl");
        } else {
          if (v.imageUrl.startsWith("data:")) {
            imageObj = {
              type: "base64",
              data: v.imageUrl
            };
          } else if (v.imageUrl.startsWith("http")) {
            imageObj = {
              type: "url",
              data: v.imageUrl
            };
          } else {
            imageObj = {
              type: "path",
              data: v.imageUrl
            };
          }
        }
        const b64 = await this.img2b64(imageObj);
        presignedImageUrl = await this.autoUpload({
          type: "base64",
          data: b64
        }, "webp");
        console.log(`Presign upload success → ${presignedImageUrl}`);
      } else {
        console.log(`Text-to-video only`);
      }
      const tryGenerate = async modelKey => {
        const endpoint = MODELS[modelKey];
        if (!endpoint) throw new Error(`No endpoint for ${modelKey}`);
        const payload = {
          videoPrompt: v.prompt,
          videoAspectRatio: v.ratio || "16:9",
          videoDuration: String(v.duration || 5),
          videoQuality: v.quality || "540p",
          videoModel: modelKey === "fast" ? "v4.5" : modelKey,
          videoPublic: v.ispublic ?? false
        };
        if (presignedImageUrl) {
          payload.videoImageUrl = presignedImageUrl;
        }
        console.log(`Generating → ${modelKey}`);
        const res = await this.api.post(endpoint.gen, payload);
        return {
          ...res.data,
          key: key,
          model: modelKey,
          imageUrl: presignedImageUrl
        };
      };
      try {
        return await tryGenerate(v.model);
      } catch (e) {
        console.warn(`Model ${v.model} failed → trying fallback...`);
        const fallbacks = ["sora2", "fast", "pixverse", "veo3", "wan25"].filter(m => m !== v.model);
        for (const fb of fallbacks) {
          try {
            return await tryGenerate(fb);
          } catch (_) {}
        }
        throw e;
      }
    } catch (e) {
      console.error(`Generate failed:`, e.message);
      if (e.name === "ValidationFailed") {
        throw new Error(`Validation: ${e.errors.map(x => x.message).join(", ")}`);
      }
      throw new Error(e.response?.data?.message || e.message);
    }
  }
  async getVideoStatus(data = {}) {
    try {
      console.log(`\nGet Video Status - Starting...`);
      console.log(`Input data:`, JSON.stringify(data, null, 2));
      const input = {
        ...data
      };
      if (!input.taskId) {
        throw new Error("Parameter 'taskId' is required");
      }
      input.model = input.model || "sora2";
      const v = validate(input, S.videoStatus);
      console.log(`Validation passed - taskId: ${v.taskId}, model: ${v.model}`);
      const {
        key
      } = await this.ensureSession(v);
      const requestStatus = async modelKey => {
        const endpoint = MODELS[modelKey];
        if (!endpoint) {
          throw new Error(`No endpoint defined for model "${modelKey}"`);
        }
        const payload = {
          taskId: v.taskId,
          videoPublic: v.ispublic ?? false
        };
        if (v.quality) payload.videoQuality = v.quality;
        if (v.ratio) payload.videoAspectRatio = v.ratio;
        if (v.prompt) payload.videoPrompt = v.prompt;
        console.log(`Checking status with model "${modelKey}" → ${endpoint.get}`);
        console.log(`Payload:`, JSON.stringify(payload, null, 2));
        try {
          const res = await this.api.post(endpoint.get, payload);
          if (!res.data) {
            throw new Error(`Empty response from ${modelKey}`);
          }
          return {
            ...res.data,
            key: key,
            model: modelKey
          };
        } catch (apiError) {
          console.error(`API Error for ${modelKey}:`, apiError.message);
          if (apiError.response) {
            const status = apiError.response.status;
            const message = apiError.response.data?.message || apiError.response.statusText;
            if (status === 404) {
              throw new Error(`Task not found in ${modelKey} (404)`);
            } else if (status === 400) {
              throw new Error(`Invalid request to ${modelKey} (400): ${message}`);
            } else if (status >= 500) {
              throw new Error(`Server error in ${modelKey} (${status})`);
            }
          }
          throw apiError;
        }
      };
      let modelsToTry = [v.model];
      if (v.model !== "sora2") {
        modelsToTry.push("sora2", "fast");
      }
      modelsToTry.push(...["pixverse", "veo3", "wan25", "pixverse-token"].filter(m => !modelsToTry.includes(m)));
      console.log(`Trying models in order:`, modelsToTry);
      let lastError = null;
      for (const modelKey of modelsToTry) {
        try {
          console.log(`Attempting with model: ${modelKey}`);
          const result = await requestStatus(modelKey);
          console.log(`✅ Success with model: ${modelKey}`);
          return result;
        } catch (error) {
          console.warn(`❌ Model ${modelKey} failed:`, error.message);
          lastError = error;
          if (error.message.includes("not found") || error.message.includes("404")) {
            console.log(`Stopping fallback - task likely doesn't exist`);
            break;
          }
          if (modelsToTry.indexOf(modelKey) < modelsToTry.length - 1) {
            await sleep(500);
          }
        }
      }
      throw lastError || new Error("All models failed to retrieve video status");
    } catch (e) {
      console.error(`Get video status error:`, e.message);
      if (e.response?.data) {
        console.error(`API Response:`, e.response.data);
      }
      if (e.name === "ValidationFailed") {
        throw new Error(`Validation: ${e.errors.map(err => err.message).join(", ")}`);
      }
      throw new Error(e.response?.data?.message || e.message);
    }
  }
  async checkSessionHealth(data = {}) {
    try {
      console.log(`\n🏥 Check Session Health - Starting...`);
      const v = validate(data, S.sessionHealth);
      const {
        sessionData,
        key
      } = await this.ensureSession(v);
      console.log(`📊 Fetching health data...`);
      const res = await this.api.post("/credits", {});
      console.log(`✅ Session healthy - Credits: ${res.data?.credits || 0}`);
      return {
        healthy: true,
        credits: res.data?.credits || 0,
        email: sessionData.user?.email,
        user_id: sessionData.user?.sub,
        key: key
      };
    } catch (e) {
      console.error(`❌ Session health check failed:`, e.message);
      return {
        healthy: false,
        error: e.message,
        key: data.key
      };
    }
  }
  async list_key() {
    try {
      console.log(`\n📋 List Keys - Starting...`);
      const pastes = await this.w.listPastes();
      const keys = pastes.filter(p => p.title?.startsWith("sora2ai-session-")).map(p => p.key);
      console.log(`✅ Found ${keys.length} session keys`);
      return keys;
    } catch (error) {
      console.error(`❌ List keys error:`, error.message);
      throw error;
    }
  }
  async del_key(data = {}) {
    try {
      console.log(`\n🗑️ Delete Key - Starting...`);
      const v = validate(data, S.deleteKey);
      console.log(`🔑 Deleting key: ${v.key}`);
      const result = await this.w.delPaste(v.key);
      console.log(`✅ Key deleted successfully`);
      return result;
    } catch (error) {
      console.error(`❌ Delete key error:`, error.message);
      throw error;
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
      error: "Action required",
      code: "ACTION_REQUIRED"
    });
  }
  const api = new Sora2AI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register(params);
        break;
      case "credits":
        response = await api.getCredits(params);
        break;
      case "check_session":
        response = await api.checkSessionHealth(params);
        break;
      case "upload":
        if (!params.imageInput) {
          return res.status(400).json({
            error: "Parameter 'imageInput' is required for upload action",
            code: "PARAM_REQUIRED",
            required_params: ["imageInput"]
          });
        }
        response = await api.uploadImage(params);
        break;
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' is required for generate action",
            code: "PARAM_REQUIRED",
            required_params: ["prompt"]
          });
        }
        response = await api.generateVideo(params);
        break;
      case "status":
        if (!params.taskId) {
          return res.status(400).json({
            error: "Parameter 'taskId' is required for status action",
            code: "PARAM_REQUIRED",
            required_params: ["taskId"]
          });
        }
        response = await api.getVideoStatus(params);
        break;
      case "list_key":
        response = await api.list_key();
        break;
      case "del_key":
        if (!params.key) {
          return res.status(400).json({
            error: "Parameter 'key' is required for del_key action",
            code: "PARAM_REQUIRED",
            required_params: ["key"]
          });
        }
        response = await api.del_key(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`,
          code: "INVALID_ACTION",
          supported_actions: ["register", "credits", "check_session", "upload", "generate", "status", "list_key", "del_key"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    if (error.name === "ValidationFailed") {
      return res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_FAILED",
        details: error.errors.map(e => ({
          field: e.field,
          message: e.message,
          value: e.value
        })),
        timestamp: new Date().toISOString()
      });
    }
    return res.status(500).json({
      error: error.message || "Internal error",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString()
    });
  }
}