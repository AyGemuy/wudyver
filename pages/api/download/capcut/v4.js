import axios from "axios";
import * as cheerio from "cheerio";
class CapCutDownloader {
  constructor() {
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  log(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }
  getHeaders(customHeaders = {}) {
    return {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "id-ID",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": this.userAgent,
      ...customHeaders
    };
  }
  parseCookie(setCookie) {
    return setCookie ? setCookie.map(c => c.split(";")[0]).join("; ") : "";
  }
  async download({
    url
  }) {
    this.log(`Memulai proses untuk URL: ${url}`);
    try {
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        maxRedirects: 5,
        validateStatus: status => status < 400
      });
      const finalUrl = response.request.res.responseUrl || url;
      this.log(`URL Akhir: ${finalUrl}`);
      const cookies = this.parseCookie(response.headers["set-cookie"]);
      const html = response.data;
      const $ = cheerio.load(html);
      const rawData = $("#__MODERN_ROUTER_DATA__").html();
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
      this.log("Mengambil data komentar...");
      const comments = await this.getComments(result.id, cookies, finalUrl);
      return {
        status: true,
        result: result,
        comments: comments
      };
    } catch (error) {
      this.log(error.message, "error");
      return {
        status: false,
        message: error.message || "Terjadi kesalahan internal",
        result: null,
        comments: []
      };
    }
  }
  async getComments(templateId, cookieString, referer) {
    try {
      const apiUrl = "https://www.capcut.com/luckycat/i18n/capcut/thirdpatry_share/v1/landing_page/get_comment_list";
      const response = await axios.get(apiUrl, {
        params: {
          template_id: templateId,
          cursor: 0,
          count: 20
        },
        headers: this.getHeaders({
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          cookie: cookieString,
          referer: referer,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "app-sdk-version": "48.0.0",
          appid: "348188"
        })
      });
      const data = response.data;
      console.log(JSON.stringify(data, null, 2));
      const commentInfo = data?.data?.comment_info;
      if (!commentInfo) {
        this.log("Struktur komentar tidak sesuai", "warn");
        return {
          total_count: 0,
          has_more: false,
          comments: []
        };
      }
      const commentList = commentInfo.comment_list || [];
      this.log(`Ditemukan ${commentList.length} dari ${commentInfo.total_count} komentar.`);
      const parsedComments = commentList.map(c => ({
        comment_id: c.commentId || c.comment_id || "",
        content: c.content || "",
        user: {
          name: c.user?.name || "Anonymous",
          avatar_url: c.user?.avatarUrl || c.user?.avatar_url || "",
          description: c.user?.description || "",
          profile_url: c.user?.profileUrl || c.user?.profile_url || "",
          sec_uid: c.user?.secUid || c.user?.sec_uid || "",
          uid: c.user?.uid || 0
        },
        publish_time: c.publishTime || c.publish_time || 0,
        publish_date: c.publishTime || c.publish_time ? new Date((c.publishTime || c.publish_time) * 1e3).toISOString() : null
      }));
      return {
        total_count: commentInfo.total_count || 0,
        has_more: commentInfo.has_more || false,
        new_cursor: commentInfo.new_cursor || 0,
        comments: parsedComments
      };
    } catch (error) {
      this.log(`Gagal mengambil komentar: ${error.message}`, "warn");
      return {
        total_count: 0,
        has_more: false,
        comments: []
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
  const api = new CapCutDownloader();
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