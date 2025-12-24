import axios from "axios";
class Api {
  constructor() {
    this.config = {
      base: "https://api-pddikti.kemdiktisaintek.go.id",
      endpoint: "/pencarian/mhs",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        Origin: "https://pddikti.kemdiktisaintek.go.id",
        Pragma: "no-cache",
        Referer: "https://pddikti.kemdikbud.go.id/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    };
  }
  g() {
    const a = Math.floor(Math.random() * 223) + 1;
    const b = Math.floor(Math.random() * 256);
    const c = Math.floor(Math.random() * 256);
    const d = Math.floor(Math.random() * 256);
    return `${a}.${b}.${c}.${d}`;
  }
  async search({
    nama
  }) {
    console.log("q: start", {
      nama: nama
    });
    try {
      const ip = this.g();
      const h = {
        ...this.config.headers,
        "X-User-IP": ip
      };
      const u = `${this.config.base}${this.config.endpoint}/${encodeURIComponent(nama)}`;
      console.log("q: get", u, "IP:", ip);
      const {
        data
      } = await axios.get(axios.get(u, {
        headers: h
      }));
      console.log("q: raw", data);
      const r = data ?? [];
      console.log("q: hasil", r);
      return {
        result: r
      };
    } catch (e) {
      console.error("q: err", e?.response?.data ?? e.message);
      return {
        result: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.nama) {
    return res.status(400).json({
      error: "nama is required"
    });
  }
  try {
    const api = new Api();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error("handler: err", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}