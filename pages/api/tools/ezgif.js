import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class EzGifConverter {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.modes = null;
    this.convertersUrl = "https://ezgif.com/converters";
    this.makersUrl = "https://ezgif.com";
  }
  log(msg) {
    console.log(`[EzGif] ${msg}`);
  }
  async resolveMedia(input, defaultName = "file.png") {
    try {
      if (!input) throw new Error("Media input is required");
      if (Buffer.isBuffer(input)) {
        this.log("Media type: Buffer");
        return {
          buffer: input,
          filename: defaultName
        };
      }
      if (typeof input !== "string") {
        throw new Error("Invalid media input type. Expected: URL, base64, or Buffer");
      }
      if (input.startsWith("data:")) {
        this.log("Media type: Base64 Data URI");
        const matches = input.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) throw new Error("Invalid base64 data URI format");
        const mimeType = matches[1];
        const base64Data = matches[2];
        if (!base64Data || base64Data.length < 10) {
          throw new Error("Base64 data is too short or empty");
        }
        const buffer = Buffer.from(base64Data, "base64");
        if (buffer.length === 0) throw new Error("Decoded buffer is empty");
        const ext = mimeType.split("/")[1]?.split("+")[0] || "png";
        const filename = defaultName.includes(".") ? defaultName : `${defaultName}.${ext}`;
        this.log(`Decoded ${buffer.length} bytes from data URI`);
        return {
          buffer: buffer,
          filename: filename
        };
      }
      if (/^[A-Za-z0-9+/=]+$/.test(input) && input.length > 100) {
        this.log("Media type: Plain Base64");
        const buffer = Buffer.from(input, "base64");
        if (buffer.length === 0) throw new Error("Decoded buffer is empty");
        this.log(`Decoded ${buffer.length} bytes from plain base64`);
        return {
          buffer: buffer,
          filename: defaultName
        };
      }
      if (input.startsWith("http://") || input.startsWith("https://")) {
        this.log(`Media type: URL - ${input}`);
        const response = await this.client.get(input, {
          responseType: "arraybuffer",
          maxContentLength: 100 * 1024 * 1024,
          validateStatus: status => status >= 200 && status < 300
        });
        const buffer = Buffer.from(response.data);
        if (buffer.length === 0) throw new Error("Downloaded file is empty");
        let filename = defaultName;
        const urlPath = new URL(input).pathname;
        const urlFilename = urlPath.split("/").pop();
        if (urlFilename && urlFilename.includes(".")) {
          filename = urlFilename;
        } else {
          const contentType = response.headers["content-type"];
          if (contentType) {
            const ext = contentType.split("/")[1]?.split(";")[0] || "png";
            filename = defaultName.includes(".") ? defaultName : `${defaultName}.${ext}`;
          }
        }
        this.log(`Downloaded: ${buffer.length} bytes as ${filename}`);
        return {
          buffer: buffer,
          filename: filename
        };
      }
      throw new Error("Invalid media format");
    } catch (e) {
      throw new Error(`Media resolve failed: ${e.message}`);
    }
  }
  res(success, data = null, message = "") {
    if (success) {
      this.log(`✓ ${message}`);
      return data;
    } else {
      this.log(`✗ ${message}`);
      return {
        success: false,
        error: message,
        timestamp: new Date().toISOString()
      };
    }
  }
  async init() {
    if (this.modes) return this.modes;
    try {
      this.log("Initializing converter list...");
      const [convertersPage, mainPage] = await Promise.all([this.client.get(this.convertersUrl).catch(() => ({
        data: ""
      })), this.client.get(this.makersUrl).catch(() => ({
        data: ""
      }))]);
      const modes = {
        convert: {},
        render: {},
        overlay: "https://ezgif.com/overlay"
      };
      const $conv = cheerio.load(convertersPage?.data || "");
      $conv('a[href^="/"][title*="converter"], a[name*="2"]').get().map(el => {
        const $el = $conv(el);
        const href = $el.attr("href") || $el.attr("name");
        const title = $el.text()?.trim() || $el.attr("title")?.trim();
        if (href && (title || href.includes("-to-"))) {
          const cleanHref = href.replace(/^\//, "").replace(/\/$/, "");
          const type = cleanHref.toLowerCase();
          if (type.includes("-to-") && !type.includes("maker") && !modes.convert[type]) {
            modes.convert[type] = `https://ezgif.com/${cleanHref}`;
            const [from, to] = type.split("-to-");
            if (to) {
              if (!modes.convert[type].mediaType) {
                if (["mp3", "wav", "ogg", "aac"].includes(to)) {
                  modes.convert[type] = {
                    url: `https://ezgif.com/${cleanHref}`,
                    type: "audio"
                  };
                } else if (["mp4", "webm", "avi", "mov", "mkv"].includes(from) || ["mp4", "webm", "avi"].includes(to)) {
                  modes.convert[type] = {
                    url: `https://ezgif.com/${cleanHref}`,
                    type: "video"
                  };
                } else {
                  modes.convert[type] = {
                    url: `https://ezgif.com/${cleanHref}`,
                    type: "image"
                  };
                }
              }
            }
          }
        }
      });
      const $main = cheerio.load(mainPage?.data || "");
      const makerLinks = [{
        path: "/maker",
        type: "gif"
      }, {
        path: "/webp-maker",
        type: "webp"
      }, {
        path: "/apng-maker",
        type: "apng"
      }, {
        path: "/avif-maker",
        type: "avif"
      }, {
        path: "/jxl-maker",
        type: "jxl"
      }, {
        path: "/mng-maker",
        type: "mng"
      }];
      makerLinks.forEach(({
        path,
        type
      }) => {
        if ($main(`a[href="${path}"]`).get().length > 0) {
          modes.render[type] = `https://ezgif.com${path}`;
        }
      });
      if (Object.keys(modes.convert).length < 10) {
        const fallbacks = {
          "mp4-to-mp3": {
            url: "https://ezgif.com/mp4-to-mp3",
            type: "audio"
          },
          "video-to-gif": {
            url: "https://ezgif.com/video-to-gif",
            type: "image"
          },
          "gif-to-mp4": {
            url: "https://ezgif.com/gif-to-mp4",
            type: "video"
          },
          "webp-to-gif": {
            url: "https://ezgif.com/webp-to-gif",
            type: "image"
          },
          "png-to-jpg": {
            url: "https://ezgif.com/png-to-jpg",
            type: "image"
          }
        };
        Object.entries(fallbacks).forEach(([key, val]) => {
          if (!modes.convert[key]) modes.convert[key] = val;
        });
      }
      this.modes = modes;
      const convertCount = Object.keys(modes.convert).length;
      const renderCount = Object.keys(modes.render).length;
      this.log(`Initialized: ${convertCount} converters, ${renderCount} makers`);
      return this.modes;
    } catch (e) {
      this.log(`Failed to initialize: ${e.message}`);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async validate(mode, type) {
    const initResult = await this.init();
    if (initResult?.success === false) return initResult;
    const validModes = Object.keys(this.modes);
    if (!mode || !validModes.includes(mode)) {
      return this.res(false, null, `Invalid mode: ${mode}. Valid: ${validModes.join(", ")}`);
    }
    if (mode === "convert") {
      const types = Object.keys(this.modes.convert);
      if (!type || !types.includes(type)) {
        return this.res(false, null, `Invalid type: ${type}. Available: ${types.slice(0, 10).join(", ")}...`);
      }
    }
    return true;
  }
  async up(url, data) {
    try {
      this.log(`Uploading to ${url}`);
      const res = await this.client.post(url, data, {
        headers: {
          ...data.getHeaders?.() || {},
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        maxRedirects: 5
      });
      const redir = res?.request?.res?.responseUrl || res?.request?.responseURL || res?.headers?.location || "";
      if (!redir) throw new Error("No redirect URL");
      this.log(`Redirect: ${redir}`);
      return redir;
    } catch (e) {
      throw new Error(`Upload failed: ${e.message}`);
    }
  }
  async proc(url, params) {
    try {
      this.log(`Processing at ${url}`);
      const form = new FormData();
      Object.entries(params).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          val.forEach(v => form.append(key, v));
        } else {
          form.append(key, val);
        }
      });
      const res = await this.client.post(`${url}?ajax=true`, form, {
        headers: {
          ...form.getHeaders(),
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          Accept: "*/*",
          "X-Requested-With": "XMLHttpRequest",
          Origin: "https://ezgif.com",
          Referer: url
        }
      });
      return res?.data || "";
    } catch (e) {
      throw new Error(`Processing failed: ${e.message}`);
    }
  }
  fix(url) {
    if (!url) return null;
    const clean = url.replace(/^https?:/, "").replace(/^\/\//, "");
    return clean ? `https://${clean}` : null;
  }
  parse(html) {
    try {
      const $ = cheerio.load(html || "");
      const defaults = {};
      $("form input, form select, form textarea").get().map(el => {
        const $el = $(el);
        const name = $el.attr("name");
        const val = $el.attr("value") || $el.val();
        const type = $el.attr("type");
        if (name && val && type !== "file" && type !== "submit" && type !== "button") {
          defaults[name] = val;
        }
      });
      const fileId = $('input[name="file"]').eq(0).val() || $('input[name*="file"]').eq(0).val() || $('form input[type="hidden"]').eq(0).val() || "";
      this.log(`Parsed ${Object.keys(defaults).length} params, fileId: ${fileId}`);
      return {
        defaults: defaults,
        fileId: fileId
      };
    } catch (e) {
      this.log(`Parse error: ${e.message}`);
      return {
        defaults: {},
        fileId: ""
      };
    }
  }
  ext(html) {
    try {
      const $ = cheerio.load(html || "");
      const outfileLinks = [];
      $("p.outfile *").get().map(el => {
        const $el = $(el);
        const attrs = el.attribs || {};
        Object.keys(attrs).forEach(attrName => {
          const attrValue = attrs[attrName];
          if (!attrValue || typeof attrValue !== "string") return;
          let fullUrl = null;
          if (attrValue.startsWith("//")) {
            fullUrl = `https:${attrValue}`;
          } else if (attrValue.startsWith("http://") || attrValue.startsWith("https://")) {
            fullUrl = attrValue;
          }
          if (fullUrl && fullUrl.startsWith("https://") && (fullUrl.includes("ezgif.com") || fullUrl.includes("s7.ezgif") || fullUrl.includes("s6.ezgif") || fullUrl.includes("s5.ezgif") || fullUrl.includes("s8.ezgif") || fullUrl.includes("s9.ezgif"))) {
            if (!outfileLinks.some(link => link.url === fullUrl)) {
              outfileLinks.push({
                url: fullUrl,
                attribute: attrName,
                element: el.name,
                text: $el.text().trim() || "",
                alt: $el.attr("alt") || "",
                title: $el.attr("title") || ""
              });
            }
          }
        });
      });
      if (outfileLinks.length === 0) {
        throw new Error("No valid output URL found in p.outfile");
      }
      const resultUrl = outfileLinks[0].url;
      this.log(`✓ Extracted ${outfileLinks.length} link(s) from p.outfile`);
      const stats = {};
      const $filestats = $("p.filestats").eq(0);
      const statsText = $filestats.text();
      if (statsText) {
        const sizeMatch = statsText.match(/File size:\s*<strong>([^<]+)<\/strong>/);
        if (sizeMatch) stats.size = sizeMatch[1].trim();
        const changeMatch = statsText.match(/<span[^>]*>([\+\-][\d\.]+%)<\/span>/);
        if (changeMatch) stats.sizeChange = changeMatch[1].trim();
        const dimMatch = statsText.match(/width:\s*(\d+)px[,\s]+height:\s*(\d+)px/);
        if (dimMatch) {
          stats.width = parseInt(dimMatch[1]);
          stats.height = parseInt(dimMatch[2]);
          stats.dimensions = `${dimMatch[1]}x${dimMatch[2]}`;
        }
        const framesMatch = statsText.match(/frames:\s*(\d+)/);
        if (framesMatch) stats.frames = parseInt(framesMatch[1]);
        const typeMatch = statsText.match(/type:\s*(\w+)/);
        if (typeMatch) stats.format = typeMatch[1];
        const durationMatch = statsText.match(/duration:\s*([\d\.]+)\s*s/);
        if (durationMatch) stats.duration = parseFloat(durationMatch[1]);
        const bitrateMatch = statsText.match(/bitrate:\s*(\d+)\s*kbps/);
        if (bitrateMatch) stats.bitrate = parseInt(bitrateMatch[1]);
      }
      const saveLinks = $('table.file-menu a.save[href], table.file-menu a[href*="/save/"]').get().map(el => {
        const $el = $(el);
        const href = $el.attr("href");
        if (href) {
          const fullUrl = href.startsWith("/") ? `https://ezgif.com${href}` : href;
          return {
            url: fullUrl,
            download: $el.attr("download") !== undefined,
            rel: $el.attr("rel") || ""
          };
        }
        return null;
      }).filter(link => link !== null);
      if (saveLinks.length > 0) {
        stats.saveLink = saveLinks[0].url;
      }
      let outputType = "file";
      const urlLower = resultUrl.toLowerCase();
      const formatLower = (stats.format || "").toLowerCase();
      if (urlLower.includes(".mp3") || urlLower.includes(".wav") || urlLower.includes(".ogg") || urlLower.includes(".aac") || formatLower === "mp3" || formatLower === "wav") {
        outputType = "audio";
      } else if (urlLower.includes(".mp4") || urlLower.includes(".webm") || urlLower.includes(".avi") || urlLower.includes(".mov") || formatLower === "mp4" || formatLower === "webm") {
        outputType = "video";
      } else if (urlLower.includes(".gif") || urlLower.includes(".png") || urlLower.includes(".jpg") || urlLower.includes(".jpeg") || urlLower.includes(".webp") || urlLower.includes(".avif") || formatLower === "gif" || formatLower === "png" || formatLower === "jpg" || formatLower === "webp") {
        outputType = "image";
      } else if (urlLower.includes(".zip") || urlLower.includes(".tar") || formatLower === "zip") {
        outputType = "archive";
      }
      return {
        result: resultUrl,
        outputType: outputType,
        allLinks: outfileLinks,
        ...stats
      };
    } catch (e) {
      this.log(`Extract error: ${e.message}`);
      throw e;
    }
  }
  getId(url) {
    const parts = url?.split("/") || [];
    const last = parts[parts.length - 1] || "";
    return last.replace(".html", "").replace(".mp4", "").replace(".mp3", "");
  }
  async asyncConvert({
    type,
    url,
    ...rest
  }) {
    try {
      const validation = await this.validate("convert", type);
      if (validation !== true) return validation;
      this.log(`Convert: ${type}`);
      const converterInfo = this.modes.convert[type];
      const baseUrl = typeof converterInfo === "string" ? converterInfo : converterInfo.url;
      if (!url) {
        return this.res(false, null, "URL parameter required");
      }
      const media = await this.resolveMedia(url, "input.mp4");
      const form = new FormData();
      form.append("new-image", media.buffer, {
        filename: media.filename
      });
      form.append("new-image-url", "");
      const redir = await this.up(baseUrl, form);
      const pageRes = await this.client.get(redir);
      const {
        defaults,
        fileId
      } = this.parse(pageRes?.data || "");
      const id = this.getId(redir);
      const params = {
        file: fileId || id,
        ajax: "true",
        ...defaults,
        ...rest
      };
      this.log(`Processing with file: ${params.file}`);
      const html = await this.proc(redir, params);
      const extracted = this.ext(html);
      return this.res(true, {
        result: extracted.result,
        conversion: type,
        source: typeof url === "string" && url.startsWith("http") ? url : "buffer/base64",
        sourceFilename: media.filename,
        outputType: extracted.outputType,
        size: extracted.size,
        width: extracted.width,
        height: extracted.height,
        format: extracted.format
      }, `Conversion successful: ${type}`);
    } catch (e) {
      return this.res(false, null, `Conversion failed: ${e.message}`);
    }
  }
  async generate({
    mode = "convert",
    ...opts
  }) {
    const initResult = await this.init();
    if (initResult?.success === false) return initResult;
    if (mode === "convert") return await this.asyncConvert(opts);
    if (mode === "render") return await this.asyncRender(opts);
    if (mode === "overlay") return await this.asyncOverlay(opts);
    return this.res(false, null, `Invalid mode: ${mode}. Valid: ${Object.keys(this.modes).join(", ")}`);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new EzGifConverter();
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