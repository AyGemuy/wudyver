import axios from "axios";
class TikDownloader {
  constructor() {
    this.list = [{
      name: "RapidAPI_Scraper7",
      url: "https://tiktok-scraper7.p.rapidapi.com/?url={id}&hd=1",
      headers: {
        "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
        "X-RapidAPI-Key": "ca5c6d6fa3mshfcd2b0a0feac6b7p140e57jsn72684628152a"
      }
    }, {
      name: "RapidAPI_NoWM2",
      url: "https://tiktok-video-no-watermark2.p.rapidapi.com/?url={id}&hd=1",
      headers: {
        "X-RapidAPI-Host": "tiktok-video-no-watermark2.p.rapidapi.com",
        "X-RapidAPI-Key": "bce863d96amsh872413a9e24c63fp14c6e3jsn02a7a01302e5"
      }
    }, {
      name: "TikWM_Direct",
      url: "https://www.tikwm.com/api/?url={id}&hd=1",
      headers: {}
    }];
  }
  async req(cfg) {
    console.log(`[LOG] Memanggil API: ${cfg.name}`);
    try {
      const res = await axios({
        method: "GET",
        url: cfg.target,
        headers: cfg.headers || {}
      });
      return res?.data;
    } catch (e) {
      console.error(`[ERR] ${cfg.name} Bermasalah: ${e.message}`);
      return null;
    }
  }
  async download({
    api,
    url,
    ...rest
  }) {
    const targetUrl = url || rest?.link || "";
    const targets = api ? [this.list[api - 1]] : this.list;
    console.log(`[START] Proses URL: ${targetUrl || "Kosong"}`);
    if (!targetUrl) throw new Error("URL tidak boleh kosong!");
    for (const item of targets) {
      const config = {
        name: item?.name || "Unknown",
        target: item?.url?.replace("{id}", encodeURIComponent(targetUrl)),
        headers: item?.headers
      };
      const result = await this.req(config);
      if (result) {
        console.log(`[FINISH] Berhasil mendapatkan respon dari ${config.name}`);
        return result;
      }
    }
    throw new Error("Semua API gagal memberikan respon.");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new TikDownloader();
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