import axios from "axios";
class YouTubeDownloader {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiHost = "youtube-mp36.p.rapidapi.com";
  }
  getId(url) {
    const match = url.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\/?\?v=|\/embed\/|\/)([^\s&\?\/\#]+)/);
    return match ? match[1] : null;
  }
  async download(url) {
    const id = this.getId(url);
    if (!id) throw new Error("Invalid YouTube URL");
    try {
      const response = await axios.get(`https://${this.apiHost}/dl`, {
        params: {
          id: id
        },
        headers: {
          "X-RapidAPI-Key": this.apiKey,
          "X-RapidAPI-Host": this.apiHost
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "API request failed");
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  const downloader = new YouTubeDownloader("0647bc5201msh84a9358b48d00eep163485jsne7ecf062e49f");
  try {
    const data = await downloader.download(url);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}