import axios from "axios";
import * as cheerio from "cheerio";
class Bilibili {
  constructor() {
    this.log = m => console.log(`[Bili-Log] ${new Date().toLocaleTimeString()}: ${m}`);
  }
  async buf(url) {
    try {
      this.log("Mengunduh stream data ke memory...");
      const chunks = [];
      let start = 0,
        end = 5242880,
        size = 0;
      while (true) {
        const res = await axios.get(url, {
          headers: {
            Referer: "https://www.bilibili.tv/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
            Range: `bytes=${start}-${end}`
          },
          responseType: "arraybuffer"
        });
        size = size || parseInt(res.headers["content-range"]?.split("/")?.[1] || 0);
        chunks.push(Buffer.from(res.data));
        if (end >= size - 1 || !res.headers["content-range"]) break;
        start = end + 1;
        end = Math.min(start + 5242880 - 1, size - 1);
      }
      return Buffer.concat(chunks);
    } catch (e) {
      throw new Error(`Gagal unduh buffer: ${e.message}`);
    }
  }
  async download({
    url,
    quality = "480p",
    ...rest
  }) {
    try {
      this.log(`Memulai proses: ${url}`);
      const aid = /\/video\/(\d+)/.exec(url)?.[1];
      if (!aid) throw new Error("ID Video tidak ditemukan dalam URL");
      const html = await axios.get(url).then(res => res.data || "");
      const $ = cheerio.load(html);
      const metaTags = {};
      $("meta").each((_, el) => {
        const name = $(el).attr("name") || $(el).attr("property");
        if (name) metaTags[name] = $(el).attr("content") || "";
      });
      const info = {
        title: $("h1.bstar-meta__title").text().trim() || metaTags["og:title"]?.split("|")?.[0]?.trim() || "Unknown Title",
        locate: metaTags["og:locale"] || "Unknown Locale",
        description: metaTags["description"] || metaTags["og:description"] || "No Description",
        type: metaTags["og:video:type"] || "video",
        cover: metaTags["og:image"] || "",
        views: $(".bstar-meta__tips-left .bstar-meta-text").first().text().trim() || "0",
        like: $(".interactive__btn.interactive__like").text().trim() || "0",
        comments: $(".interactive__btn.interactive__comments").text().trim() || "0",
        favorites: $(".interactive__btn.interactive__fav").text().trim() || "0",
        downloads: $(".interactive__btn.interactive__download").text().trim() || "0"
      };
      this.log("Mengambil data stream dari API...");
      const api = await axios.get("https://api.bilibili.tv/intl/gateway/web/playurl", {
        params: {
          s_locale: "id_ID",
          platform: "web",
          aid: aid,
          qn: "64",
          type: "0",
          device: "wap",
          tf: "0",
          spm_id: "bstar-web.ugc-video-detail.0.0",
          from_spm_id: "bstar-web.homepage.trending.all",
          fnval: "16",
          fnver: "0"
        }
      }).then(res => res.data?.data || {});
      const videoList = api.playurl?.video?.map(v => ({
        quality: v.stream_info?.desc_words?.toLowerCase() || "",
        codecs: v.video_resource?.codecs,
        size: v.video_resource?.size,
        mime: v.video_resource?.mime_type,
        url: v.video_resource?.url || v.video_resource?.backup_url?.[0] || ""
      })).filter(v => v.url) || [];
      const audioList = api.playurl?.audio_resource?.map(a => ({
        size: a.size,
        url: a.url || a.backup_url?.[0] || ""
      })).filter(a => a.url) || [];
      const availableQualities = videoList.map(v => v.quality);
      const selectedVideo = videoList.find(v => v.quality.includes(quality.toLowerCase()));
      if (!selectedVideo) {
        this.log("Kualitas tidak ditemukan, membatalkan...");
        return {
          status: false,
          message: `Kualitas '${quality}' tidak tersedia.`,
          available: availableQualities
        };
      }
      this.log(`Mendownload kualitas: ${selectedVideo.quality}`);
      const mediaBuffer = await this.buf(selectedVideo.url);
      return {
        status: true,
        result: mediaBuffer.toString("base64"),
        ...info,
        media: {
          selected_quality: selectedVideo.quality,
          video: videoList,
          audio: audioList
        }
      };
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return {
        status: false,
        error: e.message || "Internal Server Error"
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
  const api = new Bilibili();
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