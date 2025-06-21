import axios from "axios";
class Anthiago {
  constructor() {
    this.baseUrl = "https://apiv2.anthiago.com/transcript";
  }
  formatTs(s) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }
  parseData(data) {
    if (data.status !== "ok") return {
      status: "error",
      message: "Transkrip tidak tersedia."
    };
    return {
      status: "ok",
      title: data.title,
      url: data.urlBase,
      subtitles: (data.subtitles || []).filter(s => s.f && typeof s.t === "number").map(s => ({
        time: this.formatTs(s.t),
        seconds: s.t,
        text: s.f.trim()
      }))
    };
  }
  async transcript({
    url,
    lang = "id",
    status = false
  }) {
    try {
      const res = await axios.get(this.baseUrl, {
        params: {
          get_video: url,
          codeL: lang,
          status: status
        },
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          origin: "https://anthiago.com",
          referer: "https://anthiago.com/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      return this.parseData(res.data);
    } catch (e) {
      return {
        status: "error",
        message: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) return res.status(400).json({
    message: "No url provided"
  });
  try {
    const api = new Anthiago();
    const result = await api.transcript(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}