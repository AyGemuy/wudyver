import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class SscCut {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      timeout: 3e4
    }));
    this.base = "https://ssccut.com";
    this.ajax = `${this.base}/wp-admin/admin-ajax.php`;
  }
  log(msg, type = "info") {
    const time = new Date().toLocaleTimeString();
    const icon = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";
    console.log(`[${time}] ${icon} ${msg}`);
  }
  head(ref) {
    return {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: this.base,
      referer: ref || this.base,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      priority: "u=1, i"
    };
  }
  async req(url, method = "GET", data = null, headers = {}) {
    try {
      const opts = {
        method: method,
        url: url,
        headers: {
          ...this.head(),
          ...headers
        },
        data: data || undefined
      };
      return await this.client(opts);
    } catch (e) {
      this.log(`Req Error: ${e.message}`, "error");
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    this.log(`Start processing: ${url}`);
    try {
      this.log("Mengambil Token & Nonce...");
      const pageRes = await this.req(this.base, "GET");
      if (!pageRes?.data) throw new Error("Gagal memuat halaman utama");
      const $ = cheerio.load(pageRes.data);
      const scriptContent = $("#video-downloader-script-js-extra").html();
      const match = scriptContent?.match(/var videoDownloader\s*=\s*(\{.*?\});/);
      let config = null;
      if (match && match[1]) {
        config = JSON.parse(match[1]);
      }
      const nonce = config?.nonce;
      if (!nonce) {
        throw new Error("Gagal mengekstrak Nonce dari halaman");
      }
      this.log(`Nonce ditemukan: ${nonce}`);
      const payload = new URLSearchParams({
        action: "fetch_capcut_content",
        nonce: nonce,
        url: url,
        ...rest
      }).toString();
      this.log("Mengirim permintaan data...");
      const apiRes = await this.req(this.ajax, "POST", payload, {
        referer: this.base + "/"
      });
      const json = apiRes?.data;
      if (!json?.success || !json?.data) {
        throw new Error("Gagal mengambil data video atau URL tidak valid");
      }
      const htmlString = json.data.html || json.data;
      const $$ = cheerio.load(htmlString);
      const rawData = $$("#__MODERN_ROUTER_DATA__").html();
      if (!rawData) {
        throw new Error("Data router tidak ditemukan dalam HTML");
      }
      const jsonData = JSON.parse(rawData);
      const templateDetail = jsonData?.loaderData?.["template-detail_$"]?.templateDetail;
      if (!templateDetail?.templateId) {
        throw new Error("Detail template tidak valid atau kosong");
      }
      const result = {
        id: templateDetail.templateId,
        title: templateDetail.title || "No Title",
        description: templateDetail.desc || "",
        cover_url: templateDetail.coverUrl || "",
        video_url: templateDetail.videoUrl || "",
        video_width: templateDetail.videoWidth || 0,
        video_height: templateDetail.videoHeight || 0,
        duration_ms: templateDetail.templateDuration || 0,
        duration_sec: templateDetail.templateDuration ? (templateDetail.templateDuration / 1e3).toFixed(2) : 0,
        play_amount: templateDetail.playAmount || 0,
        usage_amount: templateDetail.usageAmount || 0,
        like_amount: templateDetail.likeAmount || 0,
        comment_amount: templateDetail.commentAmount || 0,
        segment_amount: templateDetail.segmentAmount || 0,
        create_time: templateDetail.createTime || 0,
        create_date: templateDetail.createTime ? new Date(templateDetail.createTime * 1e3).toISOString() : null,
        author: {
          name: templateDetail.author?.name || "Unknown",
          avatar_url: templateDetail.author?.avatarUrl || "",
          description: templateDetail.author?.description || "",
          profile_url: templateDetail.author?.profileUrl || "",
          sec_uid: templateDetail.author?.secUid || "",
          uid: templateDetail.author?.uid || 0
        },
        structured_data: templateDetail.structuredData || null
      };
      this.log(`Berhasil parsing data: ${result.title}`);
      return {
        status: true,
        result: result
      };
    } catch (e) {
      this.log(e.message, "error");
      return {
        status: false,
        msg: e.message || "Error tidak diketahui",
        data: null
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
  const api = new SscCut();
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