import axios from "axios";
class Ytmp4Downloader {
  constructor() {
    this.baseUrl = "https://api.ytmp4.fit/api";
    this.headers = {
      Accept: "application/json",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      Origin: "https://ytmp4.fit",
      Pragma: "no-cache",
      Referer: "https://ytmp4.fit/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async download({
    url,
    quality = "360p",
    media = false
  }) {
    try {
      const infoResponse = await axios.post(`${this.baseUrl}/video-info`, {
        url: url
      }, {
        headers: this.headers
      });
      const videoInfo = infoResponse.data;
      if (media) {
        const downloadHeaders = {
          ...this.headers,
          Accept: "application/octet-stream"
        };
        const downloadResponse = await axios.post(`${this.baseUrl}/download`, {
          url: url,
          quality: quality
        }, {
          headers: downloadHeaders,
          responseType: "arraybuffer"
        });
        const base64Data = Buffer.from(downloadResponse.data).toString("base64");
        return {
          ...videoInfo,
          media: base64Data
        };
      } else {
        return {
          ...videoInfo,
          media: null
        };
      }
    } catch (error) {
      console.error("Error during download:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) {
      return res.status(400).json({
        error: "No URL"
      });
    }
    res.setHeader("Accept-Encoding", "gzip, deflate, br, zstd");
    const downloader = new Ytmp4Downloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}