import axios from "axios";
import * as cheerio from "cheerio";
const API_URL = "https://api.iteraplay.com/generate-player-url.php";
const HEADERS = {
  accept: "*/*",
  "accept-language": "id-ID",
  "cache-control": "no-cache",
  "content-type": "application/x-www-form-urlencoded",
  origin: "https://teraboxonlinevideoplayer.com",
  pragma: "no-cache",
  referer: "https://teraboxonlinevideoplayer.com/",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  "x-api-key": "terabox_downloader_2025_key"
};
class TeraboxDownloader {
  async download({
    url
  }) {
    try {
      console.log("Mengambil player URL...");
      const {
        data
      } = await axios.post(API_URL, `url=${encodeURIComponent(url)}`, {
        headers: HEADERS
      });
      const playerUrl = data?.player_url ?? data?.playerUrl;
      if (!playerUrl) throw new Error("Gagal mendapatkan player URL");
      console.log("Player URL:", playerUrl);
      const res = await axios.get(playerUrl, {
        headers: {
          ...HEADERS,
          accept: "text/html,application/xhtml+xml,*/*",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "upgrade-insecure-requests": "1"
        }
      });
      const $ = cheerio.load(res.data);
      const script = $("script").filter((i, el) => $(el).html()?.includes("const videoUrl =")).first().html();
      if (!script) throw new Error("Script video tidak ditemukan");
      const videoUrlMatch = script.match(/const videoUrl = "([^"]+)"/);
      const qualitiesMatch = script.match(/const videoQualities = (\{[^}]*\})/);
      const posterMatch = res.data.match(/poster="([^"]+)"/);
      const rawVideoUrl = videoUrlMatch?.[1]?.replace(/\\/g, "") || "";
      const rawQualities = qualitiesMatch?.[1] || "{}";
      const posterUrl = posterMatch?.[1]?.replace(/\\/g, "") || "";
      if (!rawVideoUrl) throw new Error("videoUrl tidak ditemukan");
      let videoQualities = {};
      try {
        videoQualities = eval(`(${rawQualities})`);
        Object.keys(videoQualities).forEach(k => {
          videoQualities[k] = videoQualities[k].replace(/\\/g, "");
        });
      } catch (e) {
        console.warn("Gagal parse videoQualities");
      }
      const tokenMatch = rawVideoUrl.match(/[?&]token=([^&]+)/);
      const fileNameMatch = rawVideoUrl.match(/file_name=([^&]+)/);
      const token = tokenMatch ? tokenMatch[1] : "";
      const fileName = fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : "video.mkv";
      if (!token) throw new Error("Token tidak ditemukan");
      const baseUrl = playerUrl.match(/^(https?:\/\/[^\/]+)/)?.[1] || "";
      const downloadLink = `${baseUrl}/download?token=${token}&file_name=${encodeURIComponent(fileName)}`;
      const streamUrl = `${baseUrl}/stream?token=${token}&file_name=${encodeURIComponent(fileName)}`;
      const thumbnail = posterUrl || `${baseUrl}/thumbnail?token=${token}`;
      const fastStreamUrls = {};
      Object.keys(videoQualities).forEach(res => {
        const qUrl = videoQualities[res];
        const qToken = qUrl.match(/[?&]token=([^&]+)/)?.[1] || token;
        fastStreamUrls[res] = `${baseUrl}/fast_stream?token=${qToken}`;
      });
      const availableQualities = Object.keys(videoQualities).map(q => parseInt(q)).filter(n => !isNaN(n));
      const highestQuality = availableQualities.length > 0 ? `${Math.max(...availableQualities)}p` : "Unknown";
      const result = {
        status: "success",
        total_files: 1,
        list: [{
          fs_id: null,
          name: fileName,
          size: null,
          size_formatted: null,
          type: "video",
          is_dir: "0",
          duration: null,
          quality: highestQuality,
          download_link: downloadLink,
          fast_download_link: null,
          stream_url: streamUrl,
          fast_stream_url: fastStreamUrls,
          subtitle_url: null,
          thumbnail: thumbnail,
          folder: "root"
        }]
      };
      return result;
    } catch (err) {
      console.error("Error:", err.message);
      return {
        status: "error",
        error: err.message || "Unknown error",
        total_files: 0,
        list: []
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
  const api = new TeraboxDownloader();
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