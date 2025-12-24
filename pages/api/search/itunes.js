import axios from "axios";
class ItunesSearchClient {
  constructor() {
    this.instance = axios.create();
  }
  async search({
    term,
    media = "music",
    entity = "song",
    limit = 20
  }) {
    try {
      const res = await this.instance.get(`https://itunes.apple.com/search?term=${term}&media=${media}&entity=${entity}&limit=${limit}`, {
        headers: {
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          referer: "https://maroofy.com/songs/1452859410"
        },
        decompress: true
      });
      return res.data;
    } catch (err) {
      console.error("Error searching iTunes:", err);
      throw err;
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
    const itunesSearchClient = new ItunesSearchClient();
    const response = await itunesSearchClient.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}