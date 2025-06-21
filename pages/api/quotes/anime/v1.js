import axios from "axios";
class AnimeQuote {
  constructor() {
    this.listHost = {
      1: "https://api.animechan.io/v1/quotes/random",
      2: "https://zenquotes.io/api/random",
      3: "https://qapi.vercel.app/api/random",
      4: "https://api.jsongpt.com/json?prompt=Generate%207%20anime%20quotes&quotes=array%20of%20quotes",
      5: "https://yurippe.vercel.app/api/quotes?random=7",
      6: "https://jg160007-api.vercel.app/random-quotes-anime/select/random"
    };
  }
  getHost() {
    return Object.entries(this.listHost).map(([key, url]) => ({
      host: Number(key),
      url: url
    }));
  }
  async getQuote({
    host = 1
  } = {}) {
    const url = this.listHost[host];
    if (!url) throw {
      message: "Host tidak valid.",
      list: this.getHost()
    };
    try {
      const res = await axios.get(url);
      return res.data;
    } catch {
      throw new Error("Gagal mengambil kutipan dari host.");
    }
  }
}
export default async function handler(req, res) {
  const quote = new AnimeQuote();
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const result = await quote.getQuote({
      host: Number(params.host) || 1
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.list) {
      res.status(400).json({
        message: err.message,
        availableHosts: err.list
      });
    } else {
      res.status(500).json({
        message: err.message
      });
    }
  }
}