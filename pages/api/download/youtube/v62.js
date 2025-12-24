import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class YouTubeDownloader {
  constructor() {
    this.baseUrl = "https://convert.ytmp3.wf";
    this.validFormats = ["audio", "best_video", "144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2160p"];
    const jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: jar,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=0, i",
        "sec-ch-ua": '"Lemur";v="135", "Not.A/Brand";v="8", "Microsoft Edge";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "iframe",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        referer: "https://convert.ytmp3.wf/index2"
      },
      timeout: 3e4,
      maxRedirects: 5,
      withCredentials: true
    }));
    this.jar = jar;
  }
  formatHandling(userFormat) {
    if (!this.validFormats.includes(userFormat)) {
      throw new Error(`Invalid format! Available formats: ${this.validFormats.join(", ")}`);
    }
    let isVideo = false;
    let quality = null;
    if (userFormat !== "audio") {
      isVideo = true;
      if (userFormat === "best_video") {
        quality = "10000";
      } else {
        const match = userFormat.match(/\d+/);
        quality = match ? match[0] : null;
      }
    }
    return {
      isVideo: isVideo,
      quality: quality
    };
  }
  async makeRequest(method, path, data = null, additionalHeaders = {}) {
    try {
      const config = {
        method: method,
        url: `${this.baseUrl}${path}`,
        headers: {
          ...this.client.defaults.headers,
          ...additionalHeaders
        },
        timeout: 3e4
      };
      if (data && method.toLowerCase() === "post") {
        config.data = new URLSearchParams(data).toString();
        config.headers["content-type"] = "application/x-www-form-urlencoded; charset=UTF-8";
      }
      const response = await this.client.request(config);
      return response.data;
    } catch (error) {
      console.error(`Request to ${path} failed:`, error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw new Error(`Failed to make request to ${path}: ${error.message}`);
    }
  }
  extractTokenData(html) {
    const tokenIdMatch = html.match(/token_id['"]?\s*:\s*['"]([^'"]+)['"]/);
    const tokenValidtoMatch = html.match(/token_validto['"]?\s*:\s*['"]([^'"]+)['"]/);
    if (!tokenIdMatch || !tokenValidtoMatch) {
      const scriptData = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
      if (scriptData) {
        for (const script of scriptData) {
          const altTokenId = script.match(/token_id\s*=\s*['"]([^'"]+)['"]/);
          const altTokenValidto = script.match(/token_validto\s*=\s*['"]([^'"]+)['"]/);
          if (altTokenId && altTokenValidto) {
            return {
              tokenId: altTokenId[1],
              tokenValidto: altTokenValidto[1]
            };
          }
        }
      }
      throw new Error("Failed to extract token data from response");
    }
    return {
      tokenId: tokenIdMatch[1],
      tokenValidto: tokenValidtoMatch[1]
    };
  }
  async download({
    url: youtubeUrl,
    format: userFormat = "audio"
  }) {
    try {
      console.log("Starting download process...");
      const format = this.formatHandling(userFormat);
      console.log(`Format validated: ${userFormat}`);
      const isAudio = userFormat === "audio";
      const pathButton = isAudio ? "/button/" : "/vidbutton/";
      const pathConvert = isAudio ? "/convert/" : "/vidconvert/";
      console.log("Making initial request...");
      const html = await this.makeRequest("get", `${pathButton}?url=${encodeURIComponent(youtubeUrl)}`, null, {
        referer: "https://convert.ytmp3.wf/index2",
        "sec-fetch-dest": "iframe"
      });
      const tokenData = this.extractTokenData(html);
      const payload = {
        url: youtubeUrl,
        convert: "gogogo",
        token_id: tokenData.tokenId,
        token_validto: tokenData.tokenValidto
      };
      if (format.isVideo) {
        payload.height = format.quality;
      }
      console.log("Starting conversion process...");
      const additionalHeaders = {
        referer: `${this.baseUrl}${pathButton}?url=${encodeURIComponent(youtubeUrl)}`,
        origin: this.baseUrl,
        "x-requested-with": "XMLHttpRequest",
        accept: "application/json, text/javascript, */*; q=0.01",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        priority: "u=1, i"
      };
      const conversionData = await this.makeRequest("post", pathConvert, payload, additionalHeaders);
      if (!conversionData?.jobid) {
        throw new Error("No job ID received from conversion request");
      }
      console.log("Conversion started, job ID:", conversionData.jobid);
      console.log("Polling for download progress...");
      const MAX_ATTEMPTS = 60;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const progressData = await this.makeRequest("get", `${pathConvert}?jobid=${conversionData.jobid}&time=${Date.now()}`, null, {
            ...additionalHeaders,
            accept: "application/json, text/javascript, */*; q=0.01"
          });
          if (progressData?.dlurl) {
            console.log("Download ready!");
            return progressData;
          }
          if (progressData?.ready) {
            console.log("Download ready!");
            return progressData;
          }
          if (progressData?.error) {
            throw new Error(`Conversion error: ${JSON.stringify(progressData.error)}`);
          }
          let progressText = "Waiting for conversion...";
          if (progressData?.retry) {
            progressText = typeof progressData.retry === "string" ? progressData.retry.replace(/<[^>]*>/g, "") : "Processing...";
          }
          console.log(`Attempt ${attempt}/${MAX_ATTEMPTS}: ${progressText}`);
          await new Promise(resolve => setTimeout(resolve, 3e3));
        } catch (error) {
          console.warn(`Polling attempt ${attempt} failed:`, error.message);
          if (attempt === MAX_ATTEMPTS) throw error;
          await new Promise(resolve => setTimeout(resolve, 3e3));
        }
      }
      throw new Error("Maximum polling attempts reached");
    } catch (error) {
      console.error("Download failed:", error.message);
      throw error;
    }
  }
  extractVideoId(url) {
    const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/, /youtube\.com\/v\/([^&\n?#]+)/];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    throw new Error("Invalid YouTube URL format");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const downloader = new YouTubeDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}