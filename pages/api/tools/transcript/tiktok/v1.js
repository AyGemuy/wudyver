import axios from "axios";
class TokAudit {
  constructor() {
    this.api = {
      base: "https://scriptadmin.toktools.online",
      fetch: "/v1/tiktok/fetchTikTokData",
      key: "Toktools2024@!NowMust"
    };
    this.headers = {
      accept: "*/*",
      "content-type": "application/json",
      origin: "https://script.tokaudit.io",
      referer: "https://script.tokaudit.io/",
      "user-Agent": "Postify/1.0.0",
      "x-api-key": this.api.key
    };
    this.patterns = [/tiktok\.com\/@[\w.-]+\/video\/\d+/, /vm\.tiktok\.com\/[\w.-]+/, /vt\.tiktok\.com\/[\w.-]+/];
  }
  isValidUrl(url) {
    try {
      return Boolean(new URL(url));
    } catch {
      return false;
    }
  }
  isTiktokUrl(url) {
    return this.patterns.some(p => p.test(url));
  }
  async getIP() {
    try {
      return (await axios.get("https://api.ipify.org?format=json")).data.ip;
    } catch {
      return "0.0.0.0";
    }
  }
  async fetchVideoData(link, getTranscript = false) {
    if (!link) return this.error(400, "Missing TikTok URL.");
    if (!this.isValidUrl(link)) return this.error(400, "Invalid URL.");
    if (!this.isTiktokUrl(link)) return this.error(400, "Not a TikTok link.");
    try {
      const {
        data
      } = await axios.get(`${this.api.base}${this.api.fetch}`, {
        params: {
          video: link,
          get_transcript: getTranscript,
          ip: await this.getIP()
        },
        headers: this.headers
      });
      if (!data?.data) return this.error(404, "Video not found.");
      return {
        status: true,
        code: 200,
        result: this.formatData(data.data, getTranscript ? data.subtitles : false)
      };
    } catch (e) {
      return this.error(e.response?.status || 500, "Server error.");
    }
  }
  formatData({
    id,
    desc,
    createTime,
    video,
    author,
    stats,
    music,
    challenges
  }, subtitles) {
    return {
      video: {
        id: id,
        desc: desc,
        createTime: createTime,
        duration: video.duration,
        url: video.downloadAddr,
        quality: video.videoQuality
      },
      author: {
        id: author.id,
        name: author.nickname,
        avatar: author.avatarLarger,
        verified: author.verified
      },
      stats: {
        likes: stats.diggCount,
        shares: stats.shareCount,
        comments: stats.commentCount,
        views: stats.playCount
      },
      music: {
        id: music.id,
        title: music.title,
        url: music.playUrl,
        author: music.authorName
      },
      challenges: challenges.map(({
        id,
        title
      }) => ({
        id: id,
        title: title
      })),
      subtitles: subtitles
    };
  }
  error(code, message) {
    return {
      status: false,
      code: code,
      result: {
        message: message
      }
    };
  }
}
export default async function handler(req, res) {
  const {
    url,
    transcript
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  try {
    const tokAudit = new TokAudit();
    const result = await tokAudit.fetchVideoData(url, transcript);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}