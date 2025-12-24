import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import qs from "qs";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class ScribdDownloader {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        authority: "freepdfdownloader.com",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "upgrade-insecure-requests": "1",
        ...SpoofHead()
      }
    }));
    this.baseUrl = "https://freepdfdownloader.com";
  }
  atob(str) {
    return Buffer.from(str || "", "base64").toString("utf-8");
  }
  grab(html, key) {
    const regex = new RegExp(`var\\s+${key}\\s*=\\s*['"]([^'"]+)['"]`);
    return html.match(regex)?.[1] || null;
  }
  async postApi(params) {
    const {
      link,
      lang,
      token
    } = params;
    const payload = {
      link: link,
      lang: lang || "",
      chck: ",",
      chck2: ","
    };
    const res = await this.client.post(`${this.baseUrl}/api?mode=plg&token=${token || "__"}`, qs.stringify(payload), {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: this.baseUrl,
        referer: `${this.baseUrl}/scribd`
      }
    });
    return res?.data;
  }
  async fetchFile(encLink, ticket, next) {
    const finalUrl = this.atob(encLink);
    const res = await this.client.post(finalUrl, qs.stringify({
      ticket: ticket || "",
      next: next || ""
    }), {
      responseType: "arraybuffer",
      maxRedirects: 5,
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      }
    });
    const disposition = res.headers["content-disposition"];
    let filename = "downloaded.pdf";
    if (disposition?.includes("filename=")) {
      filename = disposition.split("filename=")[1].split(";")[0].replace(/['"]/g, "").trim();
    }
    return {
      buffer: res.data,
      filename: filename,
      mimetype: res.headers["content-type"] || "application/pdf",
      size: res.headers["content-length"] || res.data.length
    };
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
      console.log("[LOG] Memulai proses Scribd...");
      const targetUrl = url || rest?.link;
      if (!targetUrl) throw new Error("URL Scribd diperlukan.");
      const pageRes = await this.client.get(`${this.baseUrl}/scribd`);
      const lang = this.grab(pageRes?.data || "", "lang");
      const token = this.grab(pageRes?.data || "", "token");
      const apiRes = await this.postApi({
        link: targetUrl,
        lang: lang,
        token: token
      });
      if (apiRes?.error_code || !apiRes?.link) throw new Error(apiRes?.left ? `Limit Scribd: ${apiRes.left}` : "Gagal generate link.");
      console.log(`[LOG] File Scribd ditemukan: ${apiRes.name}`);
      const fileData = await this.fetchFile(apiRes.link, apiRes.ticket, apiRes.next);
      const finalName = fileData.filename || `${apiRes.name}.pdf`;
      const uploadRes = await this.upload({
        buffer: fileData.buffer,
        filename: finalName
      });
      console.log("[LOG] Upload sukses!");
      return {
        status: true,
        name: finalName,
        size: fileData.size,
        mime: fileData.mimetype,
        title: apiRes?.name,
        host: apiRes?.host,
        ...uploadRes
      };
    } catch (error) {
      console.log("[ERROR]", error?.message || error);
      return {
        status: false,
        message: error?.message || "Terjadi kesalahan"
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