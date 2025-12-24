import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class ScribdDownloader {
  constructor() {
    this.jar = new CookieJar();
    this.base = "https://api.scribd-downloader.co";
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://scribd-downloader.co",
        priority: "u=1, i",
        referer: "https://scribd-downloader.co/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      timeout: 3e4,
      validateStatus: status => status < 500
    }));
  }
  log(m) {
    console.log(`[LOG] ${new Date().toLocaleTimeString()} : ${m}`);
  }
  gid(url) {
    return url?.match(/(?:doc|document|presentation)\/(\d+)/)?.[1] || null;
  }
  sig(path) {
    try {
      const b64 = Buffer.from(path).toString("base64");
      const d = Math.floor(Math.random() * b64.length);
      const p1 = (d * 666111444).toString(16);
      const rot = b64.slice(d) + b64.slice(0, d);
      const p2 = rot.split("").reverse().join("");
      const p3 = (d * 666).toString(16);
      const p4 = b64.split("").sort(() => .5 - Math.random()).join("");
      return `${p1}_${p2}_${p3}_${p4}`;
    } catch (e) {
      this.log(`Sig Error: ${e.message}`);
      return null;
    }
  }
  async getToken() {
    this.log("Mengambil x-cf-token...");
    try {
      const {
        data
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`, {
        params: {
          sitekey: "0x4AAAAAACDH5kkeUv4wSCGc",
          url: "https://scribd-downloader.co/"
        },
        timeout: 3e4
      });
      const t = data?.token || data?.data?.token;
      if (t) return t;
      throw new Error("Token kosong.");
    } catch (e) {
      this.log(`Token Error: ${e.message}`);
      return null;
    }
  }
  async upload({
    buffer,
    filename
  }) {
    console.log(`[LOG] Uploading to tmpfiles.org (${filename})...`);
    try {
      const form = new FormData();
      form.append("file", buffer, filename);
      const res = await axios.post("https://tmpfiles.org/api/v1/upload", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      const originalURL = res.data?.data?.url;
      const directURL = originalURL ? `https://tmpfiles.org/dl/${originalURL.split("/").slice(-2).join("/")}` : null;
      return {
        status: true,
        creator: "tmpfiles-uploader",
        url: directURL
      };
    } catch (e) {
      console.log("[WARN] Upload gagal.");
      return {
        status: false,
        result: null,
        message: e.message
      };
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      this.log("Memulai proses...");
      const id = this.gid(url) || rest?.id;
      if (!id) throw new Error("ID/URL tidak valid.");
      const pathInfo = `document/${id}`;
      const signature = this.sig(pathInfo);
      const metaUrl = `${this.base}/${pathInfo}?sig=${signature}`;
      this.log(`Fetching Metadata: ${id}`);
      const metaRes = await this.client.get(metaUrl);
      this.log(`Status: ${metaRes.status}`);
      if (metaRes.status !== 200) {
        throw new Error(`HTTP ${metaRes.status}: ${metaRes.statusText}`);
      }
      const meta = metaRes?.data;
      if (!meta || !meta.title) {
        throw new Error("Metadata kosong");
      }
      this.log(`Judul: ${meta.title}`);
      const cfToken = await this.getToken();
      if (!cfToken) throw new Error("Gagal bypass Turnstile.");
      this.log("Requesting PDF...");
      const pdfRes = await this.client.get(meta.pdfUrl, {
        headers: {
          "x-cf-token": cfToken,
          Referer: "https://scribd-downloader.co/"
        }
      });
      let pdfBuffer;
      if (pdfRes.data?.url) {
        this.log(`Downloading PDF dari: ${pdfRes.data.url}`);
        const dlRes = await axios.get(pdfRes.data.url, {
          responseType: "arraybuffer"
        });
        pdfBuffer = Buffer.from(dlRes.data);
      } else if (Buffer.isBuffer(pdfRes.data)) {
        pdfBuffer = pdfRes.data;
      } else {
        throw new Error("Format PDF tidak dikenali");
      }
      this.log(`PDF Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
      const filename = `${meta.title || id}.pdf`;
      const uploadResult = await this.upload({
        buffer: pdfBuffer,
        filename: filename
      });
      this.log("Selesai.");
      return {
        result: uploadResult,
        ...meta
      };
    } catch (e) {
      this.log(`[EXCEPTION] ${e?.message}`);
      return {
        success: false,
        error: e?.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new ScribdDownloader();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}