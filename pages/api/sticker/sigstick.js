import axios from "axios";
class SigstickSearch {
  constructor() {
    this.baseUrl = "https://www.sigstick.com/_next/data/XABWKXrVzvRUNmhb_U3Te";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.sigstick.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-nextjs-data": "1"
    };
  }
  async search({
    query: keyword
  }) {
    if (!keyword) throw new Error("Keyword tidak boleh kosong!");
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}/stickers.json?keyword=${encodeURIComponent(keyword)}`, {
        headers: this.headers
      });
      return data?.pageProps || [];
    } catch (error) {
      throw new Error("Gagal mencari stiker di Sigstick");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const sigstick = new SigstickSearch();
  if (!params.query) {
    return res.status(400).json({
      success: false,
      message: "Query diperlukan"
    });
  }
  try {
    const searchResult = await sigstick.search(params);
    return res.status(200).json(searchResult);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}