import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
class ILoveIMG {
  constructor() {
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      jar: this.jar
    }));
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  hdrs(token = "", extra = {}) {
    return {
      accept: "application/json",
      "accept-language": "id-ID",
      authorization: token ? `Bearer ${token}` : undefined,
      "cache-control": "no-cache",
      origin: "https://www.iloveimg.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.iloveimg.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": this.ua,
      ...extra
    };
  }
  async tools({
    ...rest
  } = {}) {
    try {
      console.log("[ILoveIMG] ⏳ Memuat daftar tools...");
      const {
        data
      } = await this.http.get("https://www.iloveimg.com", {
        headers: {
          "user-agent": this.ua
        }
      });
      const $ = cheerio.load(data);
      const list = [];
      $(".tools__item").each((i, el) => {
        const href = $(el).find("a").attr("href");
        if (href) list.push({
          mode: href.split("/").pop() || "",
          title: $(el).find("h3").text().trim()
        });
      });
      return list;
    } catch (e) {
      console.error("[ILoveIMG] ❌ Gagal memuat tools");
      return [];
    }
  }
  async conf(mode) {
    try {
      console.log(`[ILoveIMG] ⏳ Inisialisasi: ${mode}`);
      const {
        data
      } = await this.http.get(`https://www.iloveimg.com/${mode}`, {
        headers: {
          "user-agent": this.ua
        }
      });
      const $ = cheerio.load(data);
      const script = $('script:contains("ilovepdfConfig")').html() || "";
      const token = script.match(/"token":\s*"([^"]+)"/)?.[1];
      const task = script.match(/taskId\s*=\s*'([^']+)'/)?.[1];
      const tool = script.match(/"tool":\s*"([^"]+)"/)?.[1];
      const servers = script.match(/"servers":\s*\[([^\]]+)\]/)?.[1]?.match(/"api\d+g?"/g)?.map(s => s.replace(/"/g, "")) || ["api1"];
      if (!token || !task || !tool) throw new Error("API config not found");
      return {
        token: token,
        task: task,
        tool: tool,
        api: servers[Math.floor(Math.random() * servers.length)]
      };
    } catch (e) {
      throw new Error(`Conf Error: ${e.message}`);
    }
  }
  async solve(media) {
    try {
      if (Buffer.isBuffer(media)) return media;
      const s = String(media);
      if (/^https?:\/\//i.test(s)) {
        console.log(`[ILoveIMG] ⬇️ Auto-get URL: ${s.slice(0, 30)}...`);
        const {
          data
        } = await axios.get(s, {
          responseType: "arraybuffer"
        });
        return Buffer.from(data);
      }
      if (/^data:image\/[a-z]+;base64,/i.test(s)) return Buffer.from(s.split(",")[1], "base64");
      return Buffer.from(s);
    } catch (e) {
      throw new Error(`Media Solver: ${e.message}`);
    }
  }
  async up(api, token, task, medias) {
    try {
      console.log(`[ILoveIMG] 📤 Uploading ${medias.length} file(s)...`);
      const sfs = [];
      for (let i = 0; i < medias.length; i++) {
        const buf = await this.solve(medias[i]);
        const fm = new FormData();
        fm.append("file", buf, {
          filename: `media_${i}.jpg`,
          contentType: "image/jpeg"
        });
        fm.append("task", task);
        const {
          data
        } = await this.http.post(`https://${api}.iloveimg.com/v1/upload`, fm, {
          headers: this.hdrs(token, fm.getHeaders())
        });
        sfs.push({
          sf: data?.server_filename,
          fn: `input_${i}.jpg`
        });
      }
      return sfs;
    } catch (e) {
      throw new Error(`Upload: ${e.response?.data?.message || e.message}`);
    }
  }
  async proc(api, token, task, tool, sfs, opts) {
    try {
      console.log(`[ILoveIMG] ⚙️ Processing (COMMIT)...`);
      const fm = new FormData();
      fm.append("task", task);
      fm.append("tool", tool);
      const defaults = {
        compressimage: {
          packaged_filename: "iloveimg-compressed",
          compression_level: "recommended"
        },
        resizeimage: {
          packaged_filename: "iloveimg-resized",
          resize_mode: "pixels",
          maintain_ratio: "true",
          percentage: "50"
        },
        cropimage: {
          packaged_filename: "iloveimg-crop",
          x: "0",
          y: "0"
        },
        convertimage: {
          packaged_filename: "iloveimg-converted",
          convert_to: "jpg"
        },
        upscaleimage: {
          packaged_filename: "iloveimg-upscaled",
          multiplier: "2"
        },
        blurfaceimage: {
          packaged_filename: "iloveimg-blurred",
          level: "recommended",
          mode: "include"
        },
        removebackgroundimage: {
          packaged_filename: "iloveimg-background-removed"
        },
        htmlimage: {
          packaged_filename: "iloveimg-htmled"
        }
      };
      const base = defaults[tool] || {
        packaged_filename: `iloveimg-${tool}`
      };
      if (["upscaleimage", "blurfaceimage", "removebackgroundimage"].includes(tool)) {
        fm.append("width", String(opts?.width || "1224"));
        fm.append("height", String(opts?.height || "1632"));
      }
      const merged = {
        ...base,
        ...opts
      };
      Object.entries(merged).forEach(([k, v]) => {
        if (!["output", "media", "mode"].includes(k)) fm.append(k, String(v));
      });
      sfs.forEach((file, i) => {
        fm.append(`files[${i}][server_filename]`, file.sf);
        fm.append(`files[${i}][filename]`, file.fn);
        if (["upscaleimage", "blurfaceimage", "removebackgroundimage", "htmlimage"].includes(tool)) {
          fm.append(`files[${i}][processed]`, "true");
        }
      });
      const {
        data
      } = await this.http.post(`https://${api}.iloveimg.com/v1/process`, fm, {
        headers: this.hdrs(token, fm.getHeaders())
      });
      return data;
    } catch (e) {
      const err = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      throw new Error(`Process: ${err}`);
    }
  }
  async dl(api, task) {
    try {
      const {
        data
      } = await this.http.get(`https://${api}.iloveimg.com/v1/download/${task}`, {
        responseType: "arraybuffer",
        headers: {
          "user-agent": this.ua
        }
      });
      return Buffer.from(data);
    } catch (e) {
      throw new Error(`Download: ${e.message}`);
    }
  }
  async generate({
    mode,
    media,
    output = "url",
    ...rest
  }) {
    try {
      if (!mode) {
        const available = await this.tools();
        return {
          result: null,
          status: false,
          message: "Mode required",
          info: {
            available: available.map(v => v.mode)
          }
        };
      }
      if (!media || Array.isArray(media) && media.length === 0) {
        return {
          result: null,
          status: false,
          message: "Media required"
        };
      }
      const {
        token,
        task,
        tool,
        api
      } = await this.conf(mode);
      const medias = Array.isArray(media) ? media : [media];
      const sfs = await this.up(api, token, task, medias);
      await this.proc(api, token, task, tool, sfs, rest);
      let result;
      const downloadUrl = `https://${api}.iloveimg.com/v1/download/${task}`;
      if (output === "base64") {
        const buffer = await this.dl(api, task);
        result = buffer.toString("base64");
      } else if (output === "buffer") {
        result = await this.dl(api, task);
      } else {
        result = downloadUrl;
      }
      console.log("✅ Task Sukses!");
      return {
        result: result,
        status: true,
        info: {
          mode: mode,
          tool: tool,
          taskId: task,
          server: api,
          outputType: output,
          fileCount: sfs.length
        }
      };
    } catch (e) {
      console.error(`❌ [ILoveIMG Error]: ${e.message}`);
      return {
        result: null,
        status: false,
        message: e.message,
        info: {
          mode: mode || "unknown"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new ILoveIMG();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}