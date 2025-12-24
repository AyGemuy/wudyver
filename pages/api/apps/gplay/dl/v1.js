import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class Mi9Downloader {
  constructor() {
    this.baseUrl = "https://apkdownloader.pages.dev";
    this.tokenApi = `${proxy}https://token.mi9.com/`;
    this.dataApi = `${proxy}https://api.mi9.com/get`;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: this.baseUrl,
      referer: this.baseUrl + "/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua-platform": '"Android"',
      "sec-ch-ua-mobile": "?1"
    };
    this.mapDev = ["phone", "tablet", "tv", "ydev"];
    this.mapArch = ["arm64-v8a", "armeabi-v7a", "x86", "x86_64"];
    this.mapSdk = ["default", "35", "34", "33", "32", "31", "30", "29", "28", "27", "26", "25", "24", "23", "22", "21", "20", "19", "18", "17", "16", "15"];
    this.mapLang = ["en", "af", "am", "ar", "az", "be", "bg", "bn", "bs", "ca", "cs", "da", "de", "el", "es", "et", "eu", "fa", "fi", "fil", "fr", "gl", "gu", "he", "hi", "hr", "hu", "hy", "id", "is", "it", "ja", "ka", "kk", "km", "kn", "ko", "ky", "lo", "lt", "lv", "mk", "ml", "mn", "mr", "ms", "my", "ne", "nl", "no", "pa", "pl", "pt-BR", "pt-PT", "ro", "ru", "si", "sk", "sl", "sq", "sr", "sv", "sw", "ta", "te", "th", "tr", "uk", "ur", "uz", "vi", "zh-CN", "zh-TW", "zu"];
  }
  log(msg) {
    console.log(`[Mi9-DL] ${msg}`);
  }
  val(input, list, def) {
    return list.includes(input) ? input : def;
  }
  pid(str) {
    const regex = /id=([a-zA-Z0-9_.]+)/;
    const match = str?.match(regex);
    return match ? match[1] : str;
  }
  async getPlayInfo(urlOrId) {
    const pkg = this.pid(urlOrId);
    const playUrl = `https://play.google.com/store/apps/details?id=${pkg}`;
    this.log(`Fetching Play Store Info: ${pkg}`);
    try {
      const {
        data: html
      } = await axios.get(playUrl, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      this.log("Play Store HTML received, parsing...");
      const info = {
        package_id: pkg,
        url: playUrl,
        title: $("h1 span").text().trim() || "No Title",
        developer: $(".Vbfug span").text().trim() || $(".Au0qPl").text().trim() || "Unknown Developer",
        icon: $(".Mqg6jb img").attr("src") || $(".T75of").first().attr("src"),
        rating: $(".TT9eCd").text().trim().replace(",", ".") || "0",
        updated: $(".xg1aie").text().trim() || "Unknown",
        description: $(".bARER").text().trim(),
        whats_new: $('[itemprop="description"]').first().text().trim(),
        downloads: $(".wVqUob").filter((i, el) => $(el).text().includes("Download")).find(".ClM7O").text().trim() || "N/A",
        reviews: $(".wVqUob").filter((i, el) => $(el).text().includes("ulasan") || $(el).text().includes("reviews")).find(".g1rdde").text().trim() || "N/A",
        screenshots: []
      };
      $(".Atcj9b img").each((i, el) => {
        const src = $(el).attr("srcset") || $(el).attr("src") || $(el).attr("data-src");
        if (src) {
          const cleanSrc = src.split(" ")[0];
          info.screenshots.push(cleanSrc);
        }
      });
      this.log(`Info retrieved: ${info.title} (${info.updated})`);
      return info;
    } catch (err) {
      this.log(`Play Store Error: ${err.message}`);
      return {
        error: true,
        message: "Failed to fetch Play Store data",
        details: err.message
      };
    }
  }
  async download({
    url,
    ...rest
  }) {
    const pkg = this.pid(url);
    const playInfo = await this.getPlayInfo(pkg) || [];
    const conf = {
      package: pkg,
      device: this.val(rest.device, this.mapDev, "phone"),
      arch: this.val(rest.arch, this.mapArch, "arm64-v8a"),
      sdk: this.val(rest.sdk, this.mapSdk, "default"),
      lang: this.val(rest.language, this.mapLang, "en"),
      vc: "",
      device_id: ""
    };
    this.log(`Start download process: ${pkg}`);
    this.log(`Config: Device=${conf.device}, Arch=${conf.arch}, SDK=${conf.sdk}`);
    try {
      this.log("Requesting token...");
      const pLoad = {
        package: conf.package,
        device: conf.device,
        arch: conf.arch,
        vc: conf.vc,
        device_id: conf.device_id,
        sdk: conf.sdk
      };
      const rToken = await axios.post(this.tokenApi, pLoad, {
        headers: this.headers
      });
      const dToken = rToken?.data;
      if (!dToken?.success) throw new Error("Failed to get token");
      const token = dToken.token;
      const ts = dToken.timestamp;
      const dataObj = {
        hl: conf.lang,
        package: conf.package,
        device: conf.device,
        arch: conf.arch,
        vc: conf.vc,
        device_id: conf.device_id,
        sdk: conf.sdk,
        timestamp: ts
      };
      const b64Data = Buffer.from(JSON.stringify(dataObj)).toString("base64");
      this.log("Fetching APK links...");
      const rData = await axios.get(this.dataApi, {
        params: {
          token: token,
          data: b64Data
        },
        headers: {
          ...this.headers,
          accept: "text/event-stream"
        }
      });
      const lines = rData?.data?.split("\n") || [];
      let lastJson = null;
      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            const jsonStr = line.replace("data:", "").trim();
            if (!jsonStr) continue;
            const parsed = JSON.parse(jsonStr);
            if (parsed.html || parsed.progress === 100) lastJson = parsed;
          } catch (e) {}
        }
      }
      if (!lastJson || !lastJson.html) throw new Error("No HTML data found in response");
      const mi9Result = this.pars(lastJson.html, conf) || [];
      return {
        source: "Mi9",
        download: mi9Result,
        detail: playInfo
      };
    } catch (err) {
      this.log(`Error: ${err.message}`);
      return {
        error: true,
        message: err.message
      };
    }
  }
  pars(html, conf) {
    const $ = cheerio.load(html);
    const res = {
      package: conf.package,
      name: $("ul.apk_ad_info li._title a").text().trim(),
      version: $("ul.apk_ad_info span._version").text().trim(),
      developer: $("ul.apk_ad_info li").last().text().replace("Developer:", "").trim(),
      files: []
    };
    $(".apk_files_item").each((i, el) => {
      const name = $(el).find("span.der_name").text().trim();
      const size = $(el).find("span.der_size").text().trim();
      const link = $(el).find("a").attr("href");
      if (link) {
        res.files.push({
          filename: name,
          size: size,
          url: link
        });
      }
    });
    this.log(`Success! Found ${res.files.length} APK files.`);
    return res;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new Mi9Downloader();
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