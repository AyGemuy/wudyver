import axios from "axios";
class StickerSearch {
  constructor() {
    this.baseUrl = "https://api.sticker.ly/v4/sticker/searchV2";
    this.headers = {
      "x-duid": "11c87f4dace20404",
      "user-agent": "androidapp.stickerly/3.17.0 (Redmi Note 5; U; Android 29; in-ID; id;)",
      "content-type": "application/json",
      "accept-encoding": "gzip"
    };
  }
  async search({
    query,
    ...rest
  }) {
    try {
      const response = await axios.post(this.baseUrl, {
        keyword: query,
        ...rest
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error during sticker search:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query are required"
    });
  }
  try {
    const stickerly = new StickerSearch();
    const response = await stickerly.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}