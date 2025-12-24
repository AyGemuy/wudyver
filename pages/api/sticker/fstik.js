import axios from "axios";
class FstikSearch {
  constructor() {
    this.baseUrl = "https://api.fstik.app";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://webapp.fstik.app",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://webapp.fstik.app/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async search({
    query = "quby",
    limit = 15,
    skip = 0,
    type = "",
    user_token = null,
    kind = "regular"
  }) {
    try {
      const {
        data
      } = await axios.post(`${this.baseUrl}/searchStickerSet`, {
        query: query,
        limit: limit,
        skip: skip,
        type: type,
        user_token: user_token,
        kind: kind
      }, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Gagal mencari stiker");
    }
  }
  async download({
    id
  }) {
    if (!id) throw new Error("ID tidak boleh kosong!");
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}/file/${id}/sticker.webp`, {
        responseType: "arraybuffer"
      });
      return Buffer.from(data);
    } catch (error) {
      throw new Error("Gagal mengunduh stiker");
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const fstik = new FstikSearch();
  try {
    switch (action) {
      case "search":
        const searchResult = await fstik.search(params);
        return res.status(200).json(searchResult);
      case "download":
        const {
          id
        } = params;
        if (!id) return res.status(400).json({
          success: false,
          message: "ID diperlukan"
        });
        const stickerBuffer = await fstik.download({
          id: id
        });
        res.setHeader("Content-Type", "image/webp");
        return res.send(stickerBuffer);
      default:
        return res.status(400).json({
          success: false,
          message: "Aksi tidak ditemukan"
        });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}