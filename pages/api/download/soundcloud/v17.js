import axios from "axios";
class Downloader {
  constructor() {
    this.baseHeaders = {
      accept: "application/json",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://soundcloudaud.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://soundcloudaud.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    console.log("Downloader instance created.");
  }
  async _getMeta(targetUrl) {
    console.log("Proses 1: Mengambil metadata...");
    const response = await axios.post("https://sc.snapfirecdn.com/soundcloud", {
      target: targetUrl,
      gsc: "x"
    }, {
      headers: {
        ...this.baseHeaders,
        "content-type": "application/json"
      }
    });
    return response.data;
  }
  async _getDl(progressiveUrl) {
    console.log("Proses 2: Mengambil link unduhan final...");
    const response = await axios.get(`https://sc.snapfirecdn.com/soundcloud-get-dl`, {
      params: {
        target: progressiveUrl
      },
      headers: {
        ...this.baseHeaders,
        accept: "*/*"
      }
    });
    return response.data;
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`Memulai proses untuk URL: ${url}`);
    try {
      if (!url) {
        throw new Error("URL input tidak boleh kosong.");
      }
      const metaResult = await this._getMeta(url);
      const progressiveUrl = metaResult?.sound?.progressive_url;
      if (!progressiveUrl) {
        throw new Error("Gagal mendapatkan `progressive_url` dari API pertama.");
      }
      console.log("Sukses mendapatkan `progressive_url`.");
      const dlResult = await this._getDl(progressiveUrl);
      const finalUrl = dlResult?.url;
      if (!finalUrl) {
        throw new Error("Gagal mendapatkan URL unduhan final dari API kedua.");
      }
      console.log("Sukses mendapatkan link unduhan final.");
      console.log("Proses 3: Menggabungkan hasil dengan format snake_case...");
      const combinedResult = {
        success: true,
        request_url: url,
        title: metaResult?.metadata?.title || "Judul Tidak Tersedia",
        artist_name: metaResult?.metadata?.username ? metaResult.metadata.username : "Artis Tidak Diketahui",
        artist_id: metaResult?.metadata?.userid || null,
        artwork_url: metaResult?.metadata?.artwork_url || null,
        picture_url: metaResult?.metadata?.profile_picture_url || null,
        hls_url: metaResult?.sound?.hls_url || null,
        progressive_url: progressiveUrl,
        download_url: finalUrl
      };
      console.log("Proses selesai dengan sukses.");
      return combinedResult;
    } catch (error) {
      console.error("Terjadi kesalahan selama proses:", error.message);
      if (error.response?.data) {
        console.error("Data error dari server:", error.response.data);
      }
      return {
        success: false,
        request_url: url,
        error_message: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new Downloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}