import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import * as cheerio from "cheerio";
const CONFIG = {
  MODELS: {
    FREE: ["stabble-diffusion/furricanes-human-mix", "stabble-diffusion/epicrealism-v4", "stabble-diffusion/illustration", "stabble-diffusion/helloflatcute2d", "stabble-diffusion/aniverse", "stabble-diffusion/furryrock-v7", "stabble-diffusion/wand-ducstyle"],
    PREMIUM: ["stabble-diffusion/fuwafuwamix", "stabble-diffusion/duchaitenniji", "stabble-diffusion/manmaru-mix", "stabble-diffusion/anime-diffusion", "stabble-diffusion/darksushimix-mix", "stabble-diffusion/snowpearanime", "stabble-diffusion/lyrielv16", "stabble-diffusion/dark-appfactory", "stabble-diffusion/cosmic-babes", "stabble-diffusion/chilloutmix", "stabble-diffusion/disney-pixal-cartoon", "stabble-diffusion/analog-madness-v70", "stabble-diffusion/realcartoon-realistic-v17"]
  },
  STYLES: {
    FREE: ["", "cyberpunk", "anime", "neon", "scifi", "horror", "gta5", "open_lingerie", "facial_cum"],
    PREMIUM: ["riding_dildo", "cowgirl", "tgirl", "x_ray", "gloryhole", "tentacles", "reverse_cowgirl", "blowjob", "pronebone", "after_sex_lying", "epic_pussy"]
  },
  SIZES: {
    FREE: ["1024x1024", "768x1024", "1024x768"],
    PREMIUM: ["680x1024", "1024x680", "576x1024", "1024x576"]
  }
};
class MyDreams {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      timeout: 12e4,
      withCredentials: true,
      maxRedirects: 10,
      headers: {
        authority: "mydreams.studio",
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        origin: "https://mydreams.studio",
        referer: "https://mydreams.studio/image-generator-dark/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      }
    }));
    this.state = {
      nonce: null,
      settings: null,
      email: null,
      password: null,
      isLoggedIn: false
    };
    this.mailApi = "https://wudysoft.xyz/api/mails/v9";
  }
  log(msg, type = "INFO") {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${type}] ${msg}`);
  }
  loadState(base64State) {
    try {
      if (!base64State) return false;
      const jsonStr = Buffer.from(base64State, "base64").toString("utf-8");
      const data = JSON.parse(jsonStr);
      if (data.cookies) {
        this.jar = CookieJar.deserializeSync(data.cookies);
        this.client.defaults.jar = this.jar;
      }
      if (data.internal) {
        this.state = {
          ...this.state,
          ...data.internal
        };
      }
      this.log("State restored successfully", "STATE");
      return true;
    } catch (e) {
      this.log("Invalid state provided, starting fresh", "WARN");
      return false;
    }
  }
  saveState() {
    const data = {
      cookies: this.jar.serializeSync(),
      internal: this.state
    };
    return Buffer.from(JSON.stringify(data)).toString("base64");
  }
  async req(method, url, data = null, customHeaders = {}) {
    try {
      const headers = {
        ...this.client.defaults.headers,
        ...customHeaders
      };
      if (customHeaders["x-requested-with"] === undefined) {
        delete headers["x-requested-with"];
      }
      this.log(`${method.toUpperCase()} ${url.split("?")[0]}`, "REQ");
      const response = await this.client({
        method: method,
        url: url,
        data: data,
        headers: headers
      });
      return response;
    } catch (error) {
      if (error.response) {
        this.log(`Status: ${error.response.status}`, "ERROR");
        if (error.response.status === 403) {
          this.log("403 Forbidden: Nonce Expired or Bad Cookie", "DEBUG");
        }
      } else {
        this.log(error.message, "ERROR");
      }
      throw error;
    }
  }
  async resolveImage(source) {
    try {
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string") {
        if (source.startsWith("http")) {
          this.log("Downloading input image...", "PROCESS");
          const res = await axios.get(source, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (source.startsWith("data:")) {
          return Buffer.from(source.split(",")[1], "base64");
        }
        return Buffer.from(source, "base64");
      }
      return source;
    } catch (e) {
      throw new Error("Gagal memproses gambar input");
    }
  }
  validateConfig(config) {
    this.log("Validating parameters...", "CHECK");
    if (config.model) {
      if (CONFIG.MODELS.PREMIUM.includes(config.model)) {
        throw new Error(`Model '${config.model}' is PREMIUM. Free account cannot use it.`);
      }
      if (!CONFIG.MODELS.FREE.includes(config.model)) {
        this.log(`Warning: Unknown model '${config.model}', might fail.`, "WARN");
      }
    }
    if (config.style) {
      if (CONFIG.STYLES.PREMIUM.includes(config.style)) {
        throw new Error(`Style '${config.style}' is PREMIUM.`);
      }
    }
    if (config.size) {
      if (CONFIG.SIZES.PREMIUM.includes(config.size)) {
        throw new Error(`Size '${config.size}' is PREMIUM.`);
      }
    }
    this.log("Parameters Validated (Free Tier)", "CHECK");
  }
  async syncState(force = false) {
    try {
      if (this.state.nonce && this.state.settings && !force) return;
      this.log(force ? "Refreshing Session Nonce..." : "Fetching Guest State...", "STATE");
      const res = await this.req("get", "https://mydreams.studio/image-generator-dark/", null, {
        "x-requested-with": undefined,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate"
      });
      const $ = cheerio.load(res.data);
      const script = $('script:contains("TRX_ADDONS_STORAGE")').html();
      const nonce = script?.match(/"ajax_nonce":"([a-z0-9]+)"/)?.[1];
      const settings = $(".sc_igenerator_form").attr("data-igenerator-settings");
      if (nonce) this.state.nonce = nonce;
      if (settings) this.state.settings = settings;
      if (!this.state.nonce) throw new Error("Failed to scrape Nonce");
      this.log(`Synced Nonce: ${this.state.nonce}`, "DEBUG");
    } catch (error) {
      throw new Error(`Sync Error: ${error.message}`);
    }
  }
  async createMail() {
    const res = await axios.get(`${this.mailApi}?action=create`);
    return res.data?.email;
  }
  async verifyMail(email) {
    this.log(`Waiting verification for: ${email}`, "MAIL");
    for (let i = 0; i < 60; i++) {
      try {
        const res = await axios.get(`${this.mailApi}?action=message&email=${email}`);
        const msgs = res.data?.data || [];
        for (const msg of msgs) {
          const content = msg.text_content || "";
          const match = content.match(/href="(https:\/\/mydreams\.studio\/\?action=confirm_email[^"]+)"/);
          if (match && match[1]) {
            return match[1].replace(/&amp;/g, "&");
          }
        }
      } catch (e) {}
      await new Promise(r => setTimeout(r, 3e3));
    }
    throw new Error("Email verification timed out");
  }
  async registerAndLogin() {
    try {
      await this.syncState();
      const email = await this.createMail();
      if (!email) throw new Error("Email creation failed");
      const pwd = email;
      this.log(`Registering...`, "AUTH");
      const regParams = new URLSearchParams();
      regParams.append("action", "trx_addons_registration_user");
      regParams.append("nonce", this.state.nonce);
      regParams.append("redirect_to", "/nsfw-adult-ai-image-generator/?rnd=141912400");
      regParams.append("user_name", email);
      regParams.append("user_email", email);
      regParams.append("user_pwd", pwd);
      await this.req("post", "https://mydreams.studio/wp-admin/admin-ajax.php", regParams);
      const verifyLink = await this.verifyMail(email);
      this.log("Clicking Verify Link...", "AUTH");
      await this.req("get", verifyLink, null, {
        "x-requested-with": undefined,
        "sec-fetch-dest": "document"
      });
      this.log("Logging in...", "AUTH");
      const loginParams = new URLSearchParams();
      loginParams.append("action", "trx_addons_login_user");
      loginParams.append("nonce", this.state.nonce);
      loginParams.append("redirect_to", verifyLink + "&rnd=255779319");
      loginParams.append("remember", "forever");
      loginParams.append("user_log", email);
      loginParams.append("user_pwd", pwd);
      await this.req("post", "https://mydreams.studio/wp-admin/admin-ajax.php", loginParams);
      const cookies = await this.jar.getCookies("https://mydreams.studio");
      if (!cookies.some(c => c.key.includes("wordpress_logged_in"))) {
        throw new Error("Login failed (No Cookie)");
      }
      this.state.email = email;
      this.state.isLoggedIn = true;
      this.log("Session Active!", "SUCCESS");
      await this.syncState(true);
    } catch (error) {
      throw error;
    }
  }
  async generate({
    state = null,
    prompt,
    image = null,
    model,
    ...rest
  }) {
    try {
      if (state) this.loadState(state);
      if (!this.state.isLoggedIn || !this.state.nonce) {
        try {
          await this.syncState(true);
        } catch {
          await this.registerAndLogin();
        }
        if (!this.state.isLoggedIn) await this.registerAndLogin();
      }
      const isI2I = !!image;
      const config = {
        model: model || "stabble-diffusion/furricanes-human-mix",
        style: rest.style || "",
        size: rest.size || "768x1024"
      };
      this.validateConfig(config);
      this.log(`Starting ${isI2I ? "I2I" : "T2I"} task...`, "GENERATE");
      const form = new FormData();
      form.append("nonce", this.state.nonce);
      form.append("action", "trx_addons_ai_helper_igenerator");
      form.append("action_type", isI2I ? "variations" : "generation");
      form.append("settings", this.state.settings);
      form.append("prompt", prompt || "Masterpiece");
      form.append("negative_prompt", rest.negative_prompt || "");
      form.append("model", config.model);
      form.append("count", String(rest.count || 1));
      form.append("size", config.size);
      form.append("style", config.style);
      form.append("lora_model", "");
      form.append("guidance_scale", "undefined");
      form.append("inference_steps", "undefined");
      form.append("seed", "undefined");
      if (isI2I) {
        const buffer = await this.resolveImage(image);
        const filename = `${Date.now()}_${Math.random().toString(36).substr(2)}.jpg`;
        form.append("upload_image", buffer, {
          filename: filename,
          contentType: "image/jpeg"
        });
      }
      const res = await this.req("post", "https://mydreams.studio/wp-admin/admin-ajax.php", form, form.getHeaders());
      const data = res.data?.data;
      if (res.data?.error || !data?.fetch_id) {
        throw new Error(`API Error: ${JSON.stringify(res.data)}`);
      }
      this.log(`Task ID: ${data.fetch_id}`, "POLL");
      const images = await this.poll(data.fetch_id, data.fetch_model);
      return {
        success: true,
        images: images,
        state: this.saveState(),
        meta: {
          model: data.fetch_model,
          credits_used: data.fetch_number || 1
        }
      };
    } catch (error) {
      this.log(`Generate Failed: ${error.message}`, "ERROR");
      return {
        success: false,
        error: error.message,
        state: this.state.isLoggedIn ? this.saveState() : null
      };
    }
  }
  async poll(fetchId, fetchModel) {
    const max = 60;
    for (let i = 0; i < max; i++) {
      await new Promise(r => setTimeout(r, 3e3));
      try {
        const params = new URLSearchParams();
        params.append("nonce", this.state.nonce);
        params.append("action", "trx_addons_ai_helper_fetch_images");
        params.append("fetch_id", fetchId);
        params.append("fetch_url", "");
        params.append("fetch_model", fetchModel);
        const res = await this.req("post", "https://mydreams.studio/wp-admin/admin-ajax.php", params);
        const imgs = res.data?.data?.images || [];
        if (imgs.length > 0) {
          this.log(`Completed! Got ${imgs.length} images.`, "SUCCESS");
          return imgs.map(img => img.url.replace(/\\\//g, "/"));
        }
        this.log(`Polling... (${i + 1}/${max})`, "WAIT");
      } catch (e) {}
    }
    throw new Error("Polling timed out");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new MyDreams();
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