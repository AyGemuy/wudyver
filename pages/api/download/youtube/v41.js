import axios from "axios";
class YTDownloader {
  constructor() {
    this.urlSearch = "https://dl.yt-downloaderz.com/search";
    this.urlInfo = "https://dl.yt-downloaderz.com/info";
    this.urlDownload = "https://dl.yt-downloaderz.com/dld";
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
  async search(query) {
    try {
      const response = await axios.post(this.urlSearch, {
        q: query
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error("Search request failed: " + error.message);
    }
  }
  async getInfo(u) {
    try {
      const response = await axios.post(this.urlInfo, {
        u: u
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error("Get Info request failed: " + error.message);
    }
  }
  async downloadVideo(pickedVideoId, ext, fid) {
    try {
      const response = await axios.post(this.urlDownload, {
        pickedVideoId: pickedVideoId,
        ctx: "video",
        ext: ext,
        fid: fid
      }, {
        headers: this.headers
      });
      const fileUrl = this.generateFileUrl(response.data);
      return {
        ...response.data,
        fileUrl: fileUrl
      };
    } catch (error) {
      throw new Error("Download Video request failed: " + error.message);
    }
  }
  generateFileUrl(fileData) {
    const {
      fileName,
      ext
    } = fileData;
    return `https://dl.yt-downloaderz.com/f/${fileName}.${ext}`;
  }
  async downloadFile(fileUrl) {
    try {
      const response = await axios.get(fileUrl, {
        headers: this.headers,
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      throw new Error("File download failed: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const ytDownloader = new YTDownloader();
  const {
    action,
    query,
    url,
    fileName,
    ext,
    fid
  } = req.method === "GET" ? req.query : req.body;
  const videoId = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1];
  try {
    switch (action) {
      case "search":
        if (!query) throw new Error("Query parameter is missing.");
        const searchResult = await ytDownloader.search(query);
        return res.status(200).json(searchResult);
      case "detail":
        if (!videoId) throw new Error("Video ID is missing.");
        const infoResult = await ytDownloader.getInfo(videoId);
        return res.status(200).json(infoResult);
      case "download":
        if (!videoId || !ext || !fid) throw new Error("Video ID, extension, and file ID are required.");
        const downloadResult = await ytDownloader.downloadVideo(videoId, ext, fid);
        return res.status(200).json(downloadResult);
      case "get":
        if (!fileName || !ext) throw new Error("fileName, ext are required.");
        const fileUrl = ytDownloader.generateFileUrl({
          fileName: fileName,
          ext: ext || "mp4"
        });
        const fileData = await ytDownloader.downloadFile(fileUrl);
        return res.status(200).json(fileData);
      default:
        return res.status(400).json({
          error: "Invalid action."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}