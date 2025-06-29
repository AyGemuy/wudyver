import axios from "axios";
import CryptoJS from "crypto-js";
class YTDownloader {
  constructor() {
    this.qualities = ["64", "128", "192", "256", "320"];
    this.base = "https://ds2.ezsrv.net";
    this.endpoint = "/api/convert";
    this.ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/.*|youtu\.?be\/.*|m\.youtube\.com\/.*|music\.youtube\.com\/.*)$/;
    this.key = "dyhQjAtqAyTIf3PdsKcJ6nMX1suz8ksZ";
  }
  _genToken() {
    return CryptoJS.AES.encrypt(JSON.stringify({
      timestamp: Date.now()
    }), this.key).toString();
  }
  _randBase() {
    const r = Math.floor(Math.random() * 3) + 1;
    return `https://ds${r}.ezsrv.net`;
  }
  _randLongBase() {
    const r = Math.floor(Math.random() * 2) + 1;
    return `https://dsx${r}.ezsrv.net`;
  }
  async dl({
    url,
    quality = "128",
    trim = false,
    startT = 0,
    endT = 0
  }) {
    if (!this.ytRegex.test(url)) {
      throw new Error("Please enter a valid YouTube URL.");
    }
    if (!this.qualities.includes(quality)) {
      throw new Error(`Invalid quality. Available qualities are: ${this.qualities.join(", ")}.`);
    }
    if (url.includes("youtube.com/playlist")) {
      throw new Error("Playlists are not supported!");
    }
    if (url.includes("youtube.com/clip")) {
      throw new Error("Clips are not supported!");
    }
    if (url.includes("youtube.com/results") || url.includes("youtube.com/hashtag") || url.includes("youtube.com/channel")) {
      throw new Error("This is not a video URL. Please check again!");
    }
    this.base = this._randBase();
    let apiUrl = `${this.base}${this.endpoint}`;
    const token = this._genToken();
    try {
      let res = await axios.post(apiUrl, {
        url: url,
        quality: quality,
        trim: trim,
        startT: startT,
        endT: endT,
        token: token
      }, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID,id;q=0.9",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Type": "application/json",
          Origin: "https://mp3dl.to",
          Pragma: "no-cache",
          Referer: "https://mp3dl.to/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      let data = res.data;
      if (data.long === true) {
        this.base = this._randLongBase();
        apiUrl = `${this.base}${this.endpoint}`;
        const longRes = await axios.post(apiUrl, {
          url: url,
          quality: quality,
          trim: trim,
          startT: startT,
          endT: endT,
          captchaTokenLongVideo: data.token,
          videoLength: data.videoDuration
        }, {
          headers: {
            "Content-Type": "application/json"
          }
        });
        data = longRes.data;
      }
      if (data.status === "failed") {
        let msg = "Something went wrong. Please check the video URL and try again!";
        switch (data.error) {
          case "live":
            msg = "Something went wrong. Please check the video URL and try again!";
            break;
          case "player-response":
            msg = "Failed to extract any player response. Please try again 2 3 times.";
            break;
          case "429":
            msg = "This video can't be downloaded! Please try another video.";
            break;
          case "tooBig":
            msg = "Videos longer than 12 hours are not allowed.";
            break;
          case "captcha":
            msg = "Captcha verification failed. Please try again!";
            break;
          case "video-restricted":
            msg = "This video is restricted in the region where the servers are located. Please find an alternative video.";
            break;
          case "age-restricted":
            msg = "Age-restricted video can't be downloaded! Please try another video.";
            break;
          case "fetcherror":
            msg = "Unable to fetch the video from YouTube. Please try again after 5 minutes.";
            break;
          case "Token already used or expired":
            msg = "Session expired. Please refresh the page and try again!";
            break;
          case "Invalid token":
            msg = "Invalid token. Please refresh the page and try again!";
            break;
        }
        throw new Error(msg);
      }
      if (data.status === "done") {
        return data;
      }
      throw new Error("Unknown error occurred during download.");
    } catch (error) {
      if (error.response) {
        throw new Error(`Server responded with an error: ${error.response.status} - ${error.response.data}`);
      } else if (error.request) {
        throw new Error("No response received from the server. Please check your internet connection.");
      } else {
        throw error;
      }
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new YTDownloader();
    const result = await downloader.dl(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}