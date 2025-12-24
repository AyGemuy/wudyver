import axios from "axios";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class GainAIClient {
  constructor(baseUrl = "https://gainai.ai") {
    this.baseUrl = baseUrl;
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    const bfpString = JSON.stringify(this.FIXED_BFP);
    this.bfp_hash = this.murmurHash(bfpString);
    this.bfp_data = this.randStr(10) + Buffer.from(bfpString).toString("base64") + this.randStr(10);
    this.client_token = null;
    this.my_ip = null;
  }
  FIXED_BFP = {
    appCodeName: "Mozilla",
    appName: "Netscape",
    appVersion: "5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
    canvas: 1317673044,
    colorDepth: 24,
    cookieEnabled: true,
    deviceMemory: 8,
    devicePixelRatio: 2,
    doNotTrack: null,
    hardwareConcurrency: 8,
    height: 958,
    language: "id-ID",
    languages: ["id-ID"],
    maxTouchPoints: 5,
    pixelDepth: 24,
    platform: "Linux armv81",
    product: "Gecko",
    productSub: "20030107",
    timezone: "Asia/Makassar",
    timezoneOffset: -480,
    touchSupport: true,
    userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
    vendor: "Google Inc.",
    vendorSub: "",
    webgl: 1245755034,
    webglInfo: {
      VERSION: "WebGL 1.0 (OpenGL ES 2.0 Chromium)",
      SHADING_LANGUAGE_VERSION: "WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)",
      VENDOR: "WebKit",
      SUPORTED_EXTENSIONS: ["ANGLE_instanced_arrays", "EXT_blend_minmax", "EXT_clip_control", "EXT_color_buffer_half_float", "EXT_float_blend", "EXT_texture_filter_anisotropic", "EXT_sRGB", "OES_element_index_uint", "OES_fbo_render_mipmap", "OES_standard_derivatives", "OES_texture_float", "OES_texture_float_linear", "OES_texture_half_float", "OES_texture_half_float_linear", "OES_vertex_array_object", "WEBGL_blend_func_extended", "WEBGL_color_buffer_float", "WEBGL_compressed_texture_astc", "WEBGL_compressed_texture_etc", "WEBGL_compressed_texture_etc1", "WEBGL_debug_renderer_info", "WEBGL_debug_shaders", "WEBGL_depth_texture", "WEBGL_lose_context", "WEBGL_multi_draw"]
    },
    width: 431
  };
  murmurHash(key) {
    const remainder = key.length & 3,
      bytes = key.length - remainder;
    const c1 = 3432918353,
      c2 = 461845907;
    let h1 = 0,
      h1b, k1;
    for (let i = 0; i < bytes;) {
      k1 = key.charCodeAt(i) & 255 | (key.charCodeAt(++i) & 255) << 8 | (key.charCodeAt(++i) & 255) << 16 | (key.charCodeAt(++i) & 255) << 24;
      ++i;
      k1 = (k1 & 65535) * c1 + (((k1 >>> 16) * c1 & 65535) << 16) & 4294967295;
      k1 = k1 << 15 | k1 >>> 17;
      k1 = (k1 & 65535) * c2 + (((k1 >>> 16) * c2 & 65535) << 16) & 4294967295;
      h1 ^= k1;
      h1 = h1 << 13 | h1 >>> 19;
      h1b = (h1 & 65535) * 5 + (((h1 >>> 16) * 5 & 65535) << 16) & 4294967295;
      h1 = (h1b & 65535) + 27492 + (((h1b >>> 16) + 58964 & 65535) << 16);
    }
    let i = bytes - 1;
    k1 = 0;
    if (remainder >= 3) k1 ^= (key.charCodeAt(i + 2) & 255) << 16;
    if (remainder >= 2) k1 ^= (key.charCodeAt(i + 1) & 255) << 8;
    if (remainder >= 1) k1 ^= key.charCodeAt(i) & 255;
    k1 = (k1 & 65535) * c1 + (((k1 >>> 16) * c1 & 65535) << 16) & 4294967295;
    k1 = k1 << 15 | k1 >>> 17;
    k1 = (k1 & 65535) * c2 + (((k1 >>> 16) * c2 & 65535) << 16) & 4294967295;
    h1 ^= k1;
    h1 ^= key.length;
    h1 ^= h1 >>> 16;
    h1 = (h1 & 65535) * 2246822507 + (((h1 >>> 16) * 2246822507 & 65535) << 16) & 4294967295;
    h1 ^= h1 >>> 13;
    h1 = (h1 & 65535) * 3266489909 + (((h1 >>> 16) * 3266489909 & 65535) << 16) & 4294967295;
    h1 ^= h1 >>> 16;
    return h1 >>> 0;
  }
  randStr(len) {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return Array.from({
      length: len
    }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }
  async init() {
    try {
      console.log("[Init] Starting session...");
      const res = await this.client.get(`${this.baseUrl}/id`);
      const match = res.data.match(/const client_token = '([^']+)';[\s\S]*?const my_ip = '([^']+)'/);
      if (!match) throw new Error("client_token or my_ip not found");
      [, this.client_token, this.my_ip] = match;
      console.log("[Init] client_token:", this.client_token, "| my_ip:", this.my_ip);
    } catch (err) {
      console.error("[Error] init:", err.message);
      throw err;
    }
  }
  async req(action, fields = {}) {
    try {
      const form = new FormData();
      Object.entries({
        bfp_hash: this.bfp_hash,
        bfp_data: this.bfp_data,
        ip: this.my_ip,
        client_token: this.client_token,
        ...fields
      }).forEach(([k, v]) => form.append(k, v));
      const res = await this.client.post(`${this.baseUrl}/api/?action=${action}`, form, {
        headers: form.getHeaders()
      });
      console.log(`[API] ${action} =>`, res.data);
      return res.data;
    } catch (err) {
      console.error(`[Error] req(${action}):`, err.message);
      throw err;
    }
  }
  async waitForAnswer(qHash, lang = "en") {
    let tries = 0;
    while (true) {
      try {
        const res = await this.req("check_answer", {
          question_hash: qHash,
          lang: lang
        });
        if (res.status) return res;
        console.log("[Retry] Not ready, waiting 1 second...");
        await new Promise(r => setTimeout(r, 1e3));
        tries++;
        if (tries > 300) throw new Error("Timeout: Answer not available after 5 minutes");
      } catch (err) {
        console.error("[Error] waitForAnswer:", err.message);
        throw err;
      }
    }
  }
  async getTTS(hash) {
    try {
      await axios.get(`https://tts.chatgpt.org.ua/?callback=get_tts&q=${hash}&_=${Date.now()}`);
      return `https://static.chatgpt.org.ua/sounds/${hash}_0.mp3`;
    } catch {
      return null;
    }
  }
  async chat({
    prompt,
    lang = "en"
  }) {
    try {
      await this.init();
      await this.req("init_client");
      const q = await this.req("add_question", {
        question: prompt
      });
      if (!q.status) throw new Error("Failed to add_question");
      const ans = await this.waitForAnswer(q.data, lang);
      return {
        ...ans,
        mp3: await this.getTTS(q.data)
      };
    } catch (err) {
      console.error("[Error] send:", err.message);
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
    const client = new GainAIClient();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}