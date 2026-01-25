import axios from "axios";
import crypto from "crypto";
import * as cheerio from "cheerio";
import FormData from "form-data";
import https from "https";
class AIPhotoTrend {
  constructor() {
    this.base = "https://aiphototrend.yurtybs.com";
    this.cookies = {};
    this.client = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true
      }),
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 15; RMX3890) AppleWebKit/537.36",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "sec-ch-ua-platform": '"Android"',
        "sec-ch-ua": '"Not(A:Brand";v="8", "Chromium";v="144"',
        "sec-ch-ua-mobile": "?1",
        "x-requested-with": "com.aiphototrend",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });
    this.client.interceptors.response.use(response => {
      const setCookie = response.headers["set-cookie"];
      if (setCookie) {
        setCookie.forEach(cookie => {
          const [nameValue] = cookie.split(";");
          const [name, value] = nameValue.split("=");
          if (name && value) {
            this.cookies[name.trim()] = value.trim();
          }
        });
      }
      return response;
    }, error => Promise.reject(error));
    this.client.interceptors.request.use(config => {
      const cookieString = Object.entries(this.cookies).map(([name, value]) => `${name}=${value}`).join("; ");
      if (cookieString) {
        config.headers.Cookie = cookieString;
      }
      return config;
    }, error => Promise.reject(error));
  }
  getMimeFromBuffer(buffer) {
    const arr = new Uint8Array(buffer).subarray(0, 4);
    let header = "";
    for (let i = 0; i < arr.length; i++) {
      header += arr[i].toString(16);
    }
    if (header.startsWith("89504e47")) return "image/png";
    if (header.startsWith("47494638")) return "image/gif";
    if (header.startsWith("ffd8")) return "image/jpeg";
    if (header.startsWith("52494646")) return "image/webp";
    return "image/jpeg";
  }
  mimeToExt(mime) {
    const map = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif"
    };
    return map[mime] || "jpg";
  }
  genGuest() {
    try {
      const ts = Date.now();
      const rand = crypto.randomBytes(5).toString("hex");
      const deviceId = `device_${ts}_${rand}`;
      const email = `guest_${deviceId}@guest.aiphototrend.local`;
      const pwd = `Guest_${deviceId}_${crypto.randomBytes(5).toString("hex")}`;
      return {
        action: "create_guest",
        device_id: deviceId,
        email: email,
        password: pwd,
        name: "Guest User"
      };
    } catch (error) {
      console.error("✗ genGuest error:", error.message);
      throw error;
    }
  }
  async ensureAuth(state) {
    try {
      if (state) {
        try {
          this.cookies = JSON.parse(Buffer.from(state, "base64").toString());
          console.log("✓ Auth restored");
          return;
        } catch (e) {
          console.log("⚠ Invalid state, creating new session");
        }
      }
      try {
        const data = this.genGuest();
        const {
          data: res
        } = await this.client.post(`${this.base}/api/guest_auth.php`, data, {
          headers: {
            "Content-Type": "application/json",
            origin: this.base,
            referer: `${this.base}/`
          }
        });
        if (!res?.success) throw new Error(res?.message || "Auth failed");
        console.log(`✓ Guest created: ${res.user_id} | Credits: ${res.credits}`);
      } catch (error) {
        console.error("✗ Auth request error:", error.message);
        throw error;
      }
    } catch (error) {
      console.error("✗ ensureAuth error:", error.message);
      throw error;
    }
  }
  async getState() {
    try {
      return Buffer.from(JSON.stringify(this.cookies)).toString("base64");
    } catch (error) {
      console.error("✗ getState error:", error.message);
      return null;
    }
  }
  async themes({
    state,
    filter = "popular",
    category,
    ...rest
  }) {
    try {
      await this.ensureAuth(state);
      try {
        const params = new URLSearchParams({
          filter: filter
        });
        if (category) params.set("category", category);
        const {
          data
        } = await this.client.get(`${this.base}/themes.php?${params}`, {
          headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9"
          }
        });
        try {
          const $ = cheerio.load(data);
          const result = $(".ai-theme-card").get().map(el => {
            try {
              const em = $(el);
              const id = em.attr("href")?.match(/id=(\d+)/)?.[1];
              const img = em.find("img").attr("src");
              const title = em.find(".ai-theme-card__title-text").text().trim();
              const views = em.find(".ai-theme-card__meta-inline-item").eq(0).text().trim();
              const uses = em.find(".ai-theme-card__meta-inline-item").eq(1).text().trim();
              return id ? {
                id: id,
                title: title,
                image: img ? `${this.base}/${img}` : null,
                views: views,
                uses: uses
              } : null;
            } catch (error) {
              console.error("✗ Parse theme item error:", error.message);
              return null;
            }
          }).filter(Boolean);
          console.log(`✓ Found ${result.length} themes (${filter}${category ? `, ${category}` : ""})`);
          return {
            status: true,
            ts: Date.now(),
            result: result,
            state: await this.getState()
          };
        } catch (error) {
          console.error("✗ Parse HTML error:", error.message);
          throw error;
        }
      } catch (error) {
        console.error("✗ Fetch themes error:", error.message);
        throw error;
      }
    } catch (error) {
      console.error("✗ themes error:", error.message);
      throw error;
    }
  }
  async solveMedia(media) {
    try {
      if (Buffer.isBuffer(media)) {
        const mime = this.getMimeFromBuffer(media);
        return {
          buffer: media,
          mime: mime,
          ext: this.mimeToExt(mime)
        };
      }
      if (typeof media === "string" && media.startsWith("data:")) {
        try {
          const matches = media.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mime = matches[1];
            const buffer = Buffer.from(matches[2], "base64");
            return {
              buffer: buffer,
              mime: mime,
              ext: this.mimeToExt(mime)
            };
          }
          return {
            buffer: Buffer.from(media.split(",")[1], "base64"),
            mime: "image/jpeg",
            ext: "jpg"
          };
        } catch (error) {
          console.error("✗ Parse base64 error:", error.message);
          throw error;
        }
      }
      if (typeof media === "string" && media.startsWith("http")) {
        try {
          const {
            data,
            headers
          } = await axios.get(media, {
            responseType: "arraybuffer"
          });
          const mime = headers["content-type"] || "image/jpeg";
          return {
            buffer: Buffer.from(data),
            mime: mime,
            ext: this.mimeToExt(mime)
          };
        } catch (error) {
          console.error("✗ Download media error:", error.message);
          throw error;
        }
      }
      throw new Error("Invalid media format");
    } catch (error) {
      console.error("✗ solveMedia error:", error.message);
      throw error;
    }
  }
  async generate({
    state,
    image,
    theme = "42",
    fmt = null,
    ...rest
  }) {
    try {
      await this.ensureAuth(state);
      try {
        const {
          buffer,
          mime,
          ext
        } = await this.solveMedia(image);
        try {
          const form = new FormData();
          form.append("photo", buffer, {
            filename: `${Date.now()}.${ext}`,
            contentType: mime
          });
          form.append("theme_id", theme);
          console.log(`⏳ Generating with ${mime}...`);
          try {
            const {
              data: res
            } = await this.client.post(`${this.base}/generate.php`, form, {
              headers: {
                ...form.getHeaders(),
                "Content-Type": "application/multipart-formdata",
                origin: this.base,
                referer: `${this.base}/theme.php?id=${theme}`,
                "sec-fetch-site": "same-origin",
                "sec-fetch-mode": "cors",
                "sec-fetch-dest": "empty",
                priority: "u=1, i"
              }
            });
            if (!res?.success) throw new Error(res?.error || "Generation failed");
            console.log(`✓ Generated: ${res.generation_id} | Credits: ${res.remaining_credits}`);
            try {
              const url = `${this.base}/${res.output_path}`;
              const {
                data: img
              } = await this.client.get(url, {
                responseType: "arraybuffer",
                headers: {
                  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                  referer: `${this.base}/theme.php?id=${theme}`,
                  "sec-fetch-site": "same-origin",
                  "sec-fetch-mode": "no-cors",
                  "sec-fetch-dest": "image",
                  priority: "i"
                }
              });
              console.log(`✓ Downloaded: ${res.output_path}`);
              return {
                status: true,
                ts: Date.now(),
                result: {
                  url: url,
                  ...fmt === "buffer" && {
                    buffer: Buffer.from(img)
                  },
                  ...fmt === "base64" && {
                    base64: Buffer.from(img).toString("base64")
                  },
                  generation_id: res.generation_id,
                  output_path: res.output_path,
                  remaining_credits: res.remaining_credits,
                  can_refine: res.can_refine || false
                },
                state: await this.getState()
              };
            } catch (error) {
              console.error("✗ Download result error:", error.message);
              throw error;
            }
          } catch (error) {
            console.error("✗ Generate request error:", error.message);
            throw error;
          }
        } catch (error) {
          console.error("✗ FormData error:", error.message);
          throw error;
        }
      } catch (error) {
        console.error("✗ Media processing error:", error.message);
        throw error;
      }
    } catch (error) {
      console.error("✗ generate error:", error.message);
      throw error;
    }
  }
  async profile({
    state,
    ...rest
  }) {
    try {
      await this.ensureAuth(state);
      try {
        const {
          data
        } = await this.client.get(`${this.base}/profile.php`, {
          headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
            "upgrade-insecure-requests": "1",
            "sec-fetch-site": "none",
            "sec-fetch-mode": "navigate",
            "sec-fetch-user": "?1",
            "sec-fetch-dest": "document",
            priority: "u=0, i"
          }
        });
        try {
          const $ = cheerio.load(data);
          const result = {
            name: $(".profile-hero-name").text().trim(),
            email: $(".profile-hero-email").text().trim(),
            plan: $(".profile-hero-badge").text().trim(),
            credits: $(".profile-stat-value").eq(1).text().trim(),
            generations: $(".profile-stat-value").eq(0).text().trim(),
            since: $(".profile-stat-value").eq(2).text().trim()
          };
          console.log(`✓ Profile: ${result.name} | ${result.plan} | Credits: ${result.credits}`);
          return {
            status: true,
            ts: Date.now(),
            result: result,
            state: await this.getState()
          };
        } catch (error) {
          console.error("✗ Parse profile error:", error.message);
          throw error;
        }
      } catch (error) {
        console.error("✗ Fetch profile error:", error.message);
        throw error;
      }
    } catch (error) {
      console.error("✗ profile error:", error.message);
      throw error;
    }
  }
  async gallery({
    state,
    ...rest
  }) {
    try {
      await this.ensureAuth(state);
      try {
        const {
          data
        } = await this.client.get(`${this.base}/gallery.php`, {
          headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
            "upgrade-insecure-requests": "1",
            "sec-fetch-site": "none",
            "sec-fetch-mode": "navigate",
            "sec-fetch-user": "?1",
            "sec-fetch-dest": "document",
            priority: "u=0, i"
          }
        });
        try {
          const $ = cheerio.load(data);
          const result = $(".gallery-item").get().map(el => {
            try {
              const em = $(el);
              const original = em.find(".gallery-before img").attr("src");
              const generated = em.find(".gallery-after img").attr("src");
              const theme = em.find(".gallery-theme").text().trim();
              const date = em.find(".gallery-date").text().trim();
              return {
                theme: theme,
                date: date,
                original: original ? `${this.base}/${original}` : null,
                generated: generated ? `${this.base}/${generated}` : null
              };
            } catch (error) {
              console.error("✗ Parse gallery item error:", error.message);
              return null;
            }
          }).filter(Boolean);
          console.log(`✓ Gallery: ${result.length} items`);
          return {
            status: true,
            ts: Date.now(),
            result: result,
            state: await this.getState()
          };
        } catch (error) {
          console.error("✗ Parse gallery error:", error.message);
          throw error;
        }
      } catch (error) {
        console.error("✗ Fetch gallery error:", error.message);
        throw error;
      }
    } catch (error) {
      console.error("✗ gallery error:", error.message);
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
      error: "Parameter 'action' wajib diisi",
      actions: ["themes", "profile", "gallery", "generate"]
    });
  }
  const api = new AIPhotoTrend();
  try {
    let result;
    switch (action) {
      case "themes":
        result = await api.themes(params);
        break;
      case "profile":
        result = await api.profile(params);
        break;
      case "gallery":
        result = await api.gallery(params);
        break;
      case "generate":
        if (!params.image) {
          return res.status(400).json({
            error: "Parameter 'image' wajib diisi untuk action 'generate'",
            example: {
              action: "generate",
              image: "https://example.com/image.jpg",
              theme: "42"
            }
          });
        }
        result = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["themes", "profile", "gallery", "generate"]
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