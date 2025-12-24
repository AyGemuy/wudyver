import axios from "axios";
class YTDownloader {
  constructor() {
    this.baseUrl = "https://dl.yt-downloaderz.com";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://yt-downloaderz.com",
      priority: "u=1, i",
      referer: "https://yt-downloaderz.com/",
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
    query
  }) {
    if (!query) throw new Error("Query is required");
    try {
      const {
        data
      } = await axios.post(`${this.baseUrl}/search`, {
        q: query
      }, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      throw new Error("Search request failed: " + error.message);
    }
  }
  async detail({
    url
  }) {
    if (!url) throw new Error("URL is required");
    try {
      const {
        data
      } = await axios.post(`${this.baseUrl}/info`, {
        u: url
      }, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      throw new Error("Get Info request failed: " + error.message);
    }
  }
  async download({
    id,
    ext,
    fid
  }) {
    if (!id || !ext || !fid) throw new Error("id, ext, and fid are required");
    try {
      const {
        data
      } = await axios.post(`${this.baseUrl}/dld`, {
        pickedVideoId: id,
        ctx: "video",
        ext: ext,
        fid: fid
      }, {
        headers: this.headers
      });
      return {
        ...data,
        fileUrl: this.generate(data)
      };
    } catch (error) {
      throw new Error("Download request failed: " + error.message);
    }
  }
  generate({
    fileName,
    ext
  }) {
    if (!fileName || !ext) throw new Error("Invalid file data");
    return `${this.baseUrl}/f/${fileName}.${ext}`;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    action
  } = params;
  const yt = new YTDownloader();
  try {
    switch (action) {
      case "search":
        if (!params.query) return res.status(400).json({
          error: "Query is required"
        });
        return res.json(await yt.search({
          query: params.query
        }));
      case "detail":
        if (!params.url) return res.status(400).json({
          error: "URL is required"
        });
        return res.json(await yt.detail({
          url: params.url
        }));
      case "download":
        if (!params.id || !params.ext || !params.fid) return res.status(400).json({
          error: "id, ext, and fid are required"
        });
        return res.json(await yt.download({
          id: params.id,
          ext: params.ext,
          fid: params.fid
        }));
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}