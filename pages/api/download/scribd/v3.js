import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class ScribdDownloader {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
  }
  heads(ref = "https://compress.menoap.info/") {
    return {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID",
      priority: "u=0, i",
      referer: ref,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  parse(u) {
    const m = u?.match(/scribd\.com\/(?:document|doc|presentation|embeds)\/(\d+)\/([^/?]+)/);
    return m ? {
      id: m[1],
      slug: m[2]
    } : null;
  }
  build(info) {
    const slug = info?.slug || "";
    const cleanSlug = slug.toLowerCase() + "-pdf-free";
    let title = slug.replace(/-/g, " ");
    title = title.replace(/ ([Q]\d+) /g, " - $1 - ");
    const encTitle = encodeURIComponent("[PDF] " + title);
    const dlUrl = `https://docdownloader.com/get/${cleanSlug}`;
    return `https://compress.menoap.info/?fileurl=${dlUrl}&title=${encTitle}&utm_source=dlconvert&utm_medium=queue&utm_campaign=631a6915a069887d098b468e`;
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
    const log = msg => console.log(`[LOG] ${new Date().toLocaleTimeString()} -> ${msg}`);
    try {
      log("Memulai proses Menoap...");
      const targetUrl = url || rest?.link;
      const info = this.parse(targetUrl);
      if (!info) throw new Error("URL Scribd tidak valid.");
      const triggerUrl = this.build(info);
      const fileName = `${info.slug}.pdf`;
      log(`Target: ${info.slug} | Trigger: ${triggerUrl}`);
      log("Mengirim request inisiasi...");
      await this.client.get(triggerUrl, {
        headers: this.heads(targetUrl)
      });
      await new Promise(r => setTimeout(r, 1500));
      const finalEndpoint = "https://compress.menoap.info/download/compresspdf";
      log("Mengunduh buffer PDF...");
      const response = await this.client.get(finalEndpoint, {
        headers: this.heads(triggerUrl),
        responseType: "arraybuffer"
      });
      const buffer = response?.data;
      const size = buffer?.length || 0;
      if (size < 1e3) {
        throw new Error("Gagal download, buffer terlalu kecil (mungkin limit/error).");
      }
      log(`Download Buffer OK. Size: ${size} bytes.`);
      const uploadRes = await this.upload({
        buffer: buffer,
        filename: fileName
      });
      if (!uploadRes) throw new Error("Gagal upload ke cloud.");
      log("Proses Selesai.");
      return {
        status: true,
        name: fileName,
        size: size,
        mime: "application/pdf",
        id: info.id,
        slug: info.slug,
        ...uploadRes
      };
    } catch (error) {
      log(`Error: ${error?.message || "Unknown error"}`);
      return {
        status: false,
        message: error?.message || "Terjadi kesalahan sistem"
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
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}