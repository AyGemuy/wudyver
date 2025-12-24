import axios from "axios";
class BiliDownloader {
  constructor() {
    this.api = "https://downloader.bhwa233.com/zh/v1/parse";
  }
  async req(url, params, headers) {
    try {
      console.log(`[LOG] Memproses URL: ${params?.url?.slice(0, 50)}...`);
      const res = await axios.get(url, {
        params: params,
        headers: headers
      });
      return res?.data || null;
    } catch (err) {
      console.error(`[ERROR] Gagal memanggil API: ${err.message}`);
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    console.log("[LOG] Menghubungi server downloader...");
    const targetUrl = url || "";
    const headers = {
      accept: "application/json, text/plain, */*",
      referer: "https://downloader.bhwa233.com/zh",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...rest?.headers
    };
    const res = await this.req(this.api, {
      url: targetUrl
    }, headers);
    const success = res?.success ? true : false;
    const raw = success ? res.data : {};
    if (!success) {
      console.log(`[LOG] Gagal: ${res?.error || "Respon tidak diketahui"}`);
      return {
        success: false,
        error: res?.error || "Unknown error"
      };
    }
    const isXHSImage = raw?.platform === "xiaohongshu" && raw?.noteType === "image";
    const isMultiPart = raw?.isMultiPart && raw?.pages?.length > 1;
    const result = {
      success: true,
      platform: raw?.platform || "unknown",
      title: raw?.title || raw?.desc || "Unknown Title",
      duration: raw?.duration || 0,
      images: isXHSImage ? raw?.images || [] : null,
      parts: isMultiPart ? raw.pages.map(p => ({
        page: p.page,
        part: p.part,
        duration: p.duration,
        video: p.downloadVideoUrl,
        audio: p.downloadAudioUrl
      })) : null,
      video: raw?.downloadVideoUrl || null,
      audio: raw?.downloadAudioUrl || null,
      originVideo: raw?.originDownloadVideoUrl || null,
      metadata: {
        isMultiPart: isMultiPart,
        isXHSImage: isXHSImage,
        timestamp: Date.now()
      }
    };
    console.log(`[LOG] Berhasil Parse: [${result.platform}] ${result.title}`);
    return result;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new BiliDownloader();
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