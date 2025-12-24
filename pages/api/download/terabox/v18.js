import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import CryptoJS from "crypto-js";
class TeraDownloader {
  constructor() {
    this.jar = new CookieJar();
    this.req = wrapper(axios.create({
      jar: this.jar,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        referer: "https://1024teradownloader.com/"
      }
    }));
    this.salt = "xR9$kL7#mN2@pQ5!vT8&wY4*";
  }
  log(m) {
    console.log(`[${new Date().toISOString()}] ${m}`);
  }
  async dkr(v) {
    try {
      const {
        ks,
        xd
      } = v;
      const part = ks?.split(".")?.[1] || "";
      if (!part) return null;
      const time = parseInt(Buffer.from(part, "base64").toString(), 10) ^ 32570;
      const keyStr = this.salt + time;
      const h1 = CryptoJS.MD5(keyStr).toString().substring(0, 16);
      const h2 = CryptoJS.SHA1(keyStr).toString().substring(0, 16);
      const key = h1 + h2;
      const bytes = CryptoJS.AES.decrypt(xd, key);
      const decStr = bytes.toString(CryptoJS.enc.Utf8);
      return decStr ? JSON.parse(decStr) : null;
    } catch (e) {
      this.log("Gagal dekripsi: " + e.message);
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    this.log(`Memulai proses: ${url}`);
    try {
      const home = await this.req.get(`https://1024teradownloader.com/?url=${encodeURIComponent(url)}`);
      const $ = cheerio.load(home.data);
      this.log("Mengekstrak variabel script...");
      const scriptHtml = $("script").text();
      const vars = {
        ks: scriptHtml.match(/window\._kS='(.*?)'/)?.[1],
        xd: scriptHtml.match(/window\._xD='(.*?)'/)?.[1],
        et: scriptHtml.match(/window\._eT='(.*?)'/)?.[1],
        st: scriptHtml.match(/window\._sT='(.*?)'/)?.[1]
      };
      const apiData = await this.dkr(vars) || {};
      const endpoint = apiData?.worker || "https://stream-api.iteraplay.workers.dev";
      const token = apiData?.token || "";
      const ts = apiData?.t || "";
      if (!token) throw new Error("Gagal mendapatkan API Token");
      this.log(`Memanggil API Worker: ${endpoint}`);
      const formData = new URLSearchParams();
      formData.append("url", url);
      const res = await this.req.post(`${endpoint}?token=${token}&t=${ts}`, formData, {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://1024teradownloader.com"
        }
      });
      const finalData = res?.data || {
        status: "error"
      };
      if (finalData.status === "success") {
        this.log(`Berhasil: ${finalData?.list?.length || 0} file ditemukan`);
      } else {
        this.log(`API Respon: ${finalData?.message || "Gagal"}`);
      }
      return {
        success: finalData?.status === "success" ? true : false,
        ...finalData
      };
    } catch (err) {
      this.log(`Error: ${err.message}`);
      return {
        success: false,
        error: err.message
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
  const api = new TeraDownloader();
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