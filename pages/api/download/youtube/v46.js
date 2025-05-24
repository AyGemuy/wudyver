import axios from "axios";
class YouTubNow {
  constructor() {
    this.apiUrl = "https://youtubnow.co/wp-admin/admin-ajax.php";
    this.headers = {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      accept: "*/*",
      "x-requested-with": "XMLHttpRequest",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
  }
  async download({
    url
  }) {
    if (!url) return null;
    try {
      const referer = `https://youtubnow.co/watch/?v=${encodeURIComponent(url.split("v=")[1])}`;
      const data = new URLSearchParams({
        url: url,
        action: "downl0ader"
      });
      const response = await axios.post(this.apiUrl, data.toString(), {
        headers: {
          ...this.headers,
          referer: referer
        }
      });
      return response.data || "No result";
    } catch (error) {
      console.error("Download error:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new YouTubNow();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}