import axios from "axios";
class Downloader {
  constructor() {
    this.baseUrl = "https://threads.snapsave.app/api/action";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      cookie: "_ga=GA1.1.970916798.1742810676; _ga_12T6VJG2F3=GS1.1.1742810675.1.0.1742810705.0.0.0",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://threads.snapsave.app/",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  getMediaType(type) {
    return {
      GraphImage: "Photo",
      GraphVideo: "Video",
      GraphSidecar: "Gallery"
    } [type] || type || "Unknown";
  }
  getUrl(url) {
    try {
      const token = new URL(url).searchParams.get("token")?.split(".")[1];
      return token ? JSON.parse(Buffer.from(token, "base64"))?.url : url || "Unknown URL";
    } catch (error) {
      return "Invalid URL";
    }
  }
  async download({
    url
  }) {
    try {
      new URL(url);
      const response = await axios.get(this.baseUrl, {
        params: {
          url: url
        },
        headers: this.headers
      });
      const data = response.data;
      return {
        postInfo: {
          id: data.postinfo.id || "Unknown ID",
          username: data.postinfo.username || "Unknown Username",
          avatarUrl: this.getUrl(data.postinfo.avatar_url) || "Unknown Avatar",
          mediaTitle: data.postinfo.media_title || "Untitled",
          type: this.getMediaType(data.postinfo.__type)
        },
        media: data.items.map(item => ({
          type: this.getMediaType(item.__type),
          id: item.id || "Unknown ID",
          url: this.getUrl(item.url),
          width: item.width || 0,
          height: item.height || 0,
          thumbnailUrl: item.__type === "GraphVideo" ? this.getUrl(item.display_url) : "No Thumbnail",
          videoUrl: item.__type === "GraphVideo" ? this.getUrl(item.video_url) : "No Video",
          duration: item.__type === "GraphVideo" ? item.video_duration || 0 : 0
        }))
      };
    } catch (error) {
      return {
        error: error.message || "Unknown error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const threads = new Downloader();
  try {
    const data = await threads.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}