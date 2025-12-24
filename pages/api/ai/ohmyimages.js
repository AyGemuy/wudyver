import axios from "axios";
import FormData from "form-data";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import SpoofHead from "@/lib/spoof-head";
class OhMyImg {
  constructor(token = "") {
    this.base = "https://ohmyimages.com/api";
    this.token = token || "";
    this.cookies = new CookieJar();
    this.ax = wrapper(axios.create({
      baseURL: this.base,
      jar: this.cookies,
      withCredentials: true,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Ch-Ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Origin: "https://ohmyimages.com",
        Referer: "https://ohmyimages.com/",
        ...SpoofHead()
      }
    }));
    this.ax.interceptors.request.use(config => {
      config.headers["X-Ohmy-Token"] = this.getToken();
      config.headers["Priority"] = "u=1, i";
      return config;
    });
    this.ax.interceptors.response.use(async res => res, async err => {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        console.log(`[API] ${status} - Auto refresh...`);
        await this.rToken();
      }
      return Promise.reject(err);
    });
    this.interval = setInterval(() => this.rToken(), 15e3);
  }
  getToken() {
    return this.window?.__OHMY_TOKEN__?.token || this.token;
  }
  setToken(token, ttl = 180) {
    this.window = this.window || {};
    this.window.__OHMY_TOKEN__ = {
      token: token,
      issuedAt: Date.now(),
      ttl: typeof ttl === "number" ? ttl : 180
    };
    this.token = token;
  }
  async rToken() {
    console.log("[API] Refresh token...");
    try {
      const {
        data: r
      } = await this.ax.get("/auth/refresh-token");
      if (r?.token) {
        this.setToken(r.token, r.ttl);
        console.log("[API] Token refreshed");
        return true;
      }
      console.warn("[API] No token in response");
      return false;
    } catch (e) {
      console.warn("[API] Refresh failed:", e.response?.status || e.message);
      return false;
    }
  }
  async up(file) {
    console.log("[UP] Start upload:", typeof file);
    try {
      const fd = new FormData();
      let buf = await this.toBuf(file);
      fd.append("file", buf, {
        filename: "img.jpg",
        contentType: "image/jpeg"
      });
      const {
        data
      } = await this.ax.post("/upload", fd);
      const {
        url = ""
      } = data || {};
      console.log("[UP] Success:", url);
      return url;
    } catch (e) {
      console.error("[UP] Error:", e.response?.status || e.message);
      return "";
    }
  }
  async toBuf(src) {
    try {
      if (Buffer.isBuffer(src)) return src;
      if (typeof src === "string") {
        if (src.startsWith("http")) {
          const {
            data
          } = await this.ax.get(src, {
            responseType: "arraybuffer"
          });
          return Buffer.from(data);
        }
        if (src.startsWith("data:image")) {
          const base64 = src.split(",")[1];
          return Buffer.from(base64, "base64");
        }
      }
      throw new Error("Invalid image source");
    } catch (e) {
      console.error("[BUF] Error:", e.message);
      throw e;
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    console.log("=== TEXT TO IMAGE ===");
    console.log("[GEN] Start: txt2img");
    try {
      if (!this.getToken()) {
        await this.rToken();
      }
      let urls = [];
      if (imageUrl) {
        console.log("[UP] Processing images...");
        for (const img of Array.isArray(imageUrl) ? imageUrl : [imageUrl]) {
          const u = await this.up(img);
          if (u) urls.push(u);
        }
        console.log(`[UP] ${urls.length}/${imageUrl.length || 1} uploaded`);
      }
      const body = {
        prompt: prompt || "",
        images: urls,
        ...rest
      };
      console.log("[GEN] Request: txt2img");
      const {
        data
      } = await this.ax.post("/generate", body);
      console.log("[GEN] FULL RESPONSE:", JSON.stringify(data, null, 2));
      return data;
    } catch (e) {
      console.error("[GEN] Error:", e.response?.status || e.message);
      console.log("TXT FULL: null");
      return null;
    }
  }
  destroy() {
    clearInterval(this.interval);
    this.cookies = null;
    delete this.window;
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
    const client = new OhMyImg();
    const response = await client.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}