import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import * as cheerio from "cheerio";
const POLLING_INTERVAL = 3e3;
class FaceSwapClient {
  constructor(baseURL = "https://facy.ai") {
    this.baseURL = baseURL;
    this.jar = new CookieJar();
    this.client = this.setup();
  }
  setup() {
    const client = wrapper(axios.create({
      baseURL: this.baseURL,
      jar: this.jar,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        Origin: this.baseURL,
        "Accept-Language": "id,en;q=0.9"
      },
      maxRedirects: 0,
      validateStatus: () => true
    }));
    client.interceptors.response.use(r => r, async err => {
      if (err?.response?.status === 302) {
        this.log("302 detected → refresh session", "warn");
        await this.gTok().catch(() => {});
      }
      return Promise.reject(err);
    });
    return client;
  }
  log(msg, level = "info") {
    console[level](`[${new Date().toLocaleTimeString()}] [${level.toUpperCase()}] ${msg}`);
  }
  async gTok() {
    const res = await this.client.get("/swap-face-ai/photo");
    const $ = cheerio.load(res.data);
    const token = $('meta[name="_token"]').attr("content");
    this.log("Token diambil");
    if (!token) throw new Error("Token tidak ditemukan");
    return token;
  }
  async pImg(input, name) {
    let buffer, mime = "image/jpeg",
      ext = "jpg";
    if (Buffer.isBuffer(input)) buffer = input;
    else if (typeof input === "string" && input.startsWith("data:")) {
      const [, b64] = input.split(",");
      buffer = Buffer.from(b64, "base64");
      mime = input.match(/^data:([^;]+)/)?.[1] || mime;
    } else if (input.startsWith("http")) {
      const r = await axios.get(input, {
        responseType: "arraybuffer"
      });
      buffer = Buffer.from(r.data);
    } else throw new Error("Input tidak valid");
    if (buffer[0] === 137 && buffer[1] === 80) {
      mime = "image/png";
      ext = "png";
    }
    if (buffer[0] === 71 && buffer[1] === 73) {
      mime = "image/gif";
      ext = "gif";
    }
    return {
      buffer: buffer,
      filename: `${name}.${ext}`,
      mime: mime
    };
  }
  async subJob(files, token, rest = {}) {
    const form = new FormData();
    form.append("_token", token);
    form.append("recurring", rest.recurring || 0);
    form.append("duration", rest.duration || 1);
    form.append("image_has_permission", "on");
    form.append("fileInputSource", files.source.buffer, {
      filename: files.source.filename,
      contentType: files.source.mime
    });
    form.append("fileInputTarget", files.target.buffer, {
      filename: files.target.filename,
      contentType: files.target.mime
    });
    const headers = {
      ...form.getHeaders(),
      Accept: "text/html,*/*"
    };
    let res;
    try {
      res = await this.client.post("/upload", form, {
        headers: headers
      });
    } catch (e) {
      if (e.response?.status === 302) {
        res = e.response;
        this.log("302 pada upload → lanjut parse");
        setTimeout(() => this.gTok().catch(() => {}), 500);
      } else throw e;
    }
    const $ = cheerio.load(res.data);
    const url = $("a").attr("href");
    if (!url?.includes("/result_image/")) throw new Error("Redirect URL invalid");
    const jobId = url.split("/").pop();
    this.log(`Job ID: ${jobId}`);
    return jobId;
  }
  async poll(jobId) {
    this.log(`Polling ${jobId}...`);
    const getXsrf = async () => {
      const cookies = await this.jar.getCookies(this.baseURL);
      const c = cookies.find(x => x.key === "XSRF-TOKEN");
      return c ? decodeURIComponent(c.value) : "";
    };
    while (true) {
      const xsrf = await getXsrf();
      let res;
      try {
        res = await this.client.post("/getAiImageResult", {
          id: jobId
        }, {
          headers: {
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": xsrf,
            "X-Requested-With": "XMLHttpRequest",
            Referer: `${this.baseURL}/result_image/${jobId}`
          },
          maxRedirects: 0,
          validateStatus: () => true
        });
      } catch (e) {
        res = e.response || {};
      }
      if (res.status === 302) {
        this.log("302 saat polling → refresh token");
        await this.gTok().catch(() => {});
        await new Promise(r => setTimeout(r, 1e3));
        continue;
      }
      if (res.status !== 200) {
        await new Promise(r => setTimeout(r, POLLING_INTERVAL));
        continue;
      }
      let data;
      try {
        data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      } catch {
        await new Promise(r => setTimeout(r, POLLING_INTERVAL));
        continue;
      }
      const done = data.done,
        gen = data.genStatus;
      if (done === 1 && (gen === 3 || gen === -1)) {
        this.log(`Selesai! Runtime: ${data.runtime || "?"}s`);
        return `${this.baseURL}/download-image/${jobId}`;
      }
      this.log(gen === 1 ? `Antrian: ${data.queuePosition || "?"}` : gen === 2 ? "Sedang diproses..." : `Menunggu...`);
      await new Promise(r => setTimeout(r, POLLING_INTERVAL));
    }
  }
  async dwnImg(url) {
    const res = await this.client.get(url, {
      responseType: "arraybuffer"
    });
    return Buffer.from(res.data);
  }
  async generate({
    source,
    target,
    ...rest
  }) {
    const token = await this.gTok();
    const [s, t] = await Promise.all([this.pImg(source, "source"), this.pImg(target, "target")]);
    const jobId = await this.subJob({
      source: s,
      target: t
    }, token, rest);
    const dlUrl = await this.poll(jobId);
    const buffer = await this.dwnImg(dlUrl);
    return buffer;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.source || !params.target) {
    return res.status(400).json({
      error: "source and target images are required"
    });
  }
  try {
    const api = new FaceSwapClient();
    const result = await api.generate(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(result);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}