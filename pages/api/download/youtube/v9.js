import axios from "axios";
import {
  Parser
} from "xml2js";
const htmlToJson = async html => {
  const parser = new Parser({
    explicitArray: false,
    mergeAttrs: true
  });
  try {
    const result = await new Promise((resolve, reject) => {
      parser.parseString(html, (err, result) => {
        err ? reject(err) : resolve(result);
      });
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to parse HTML: ${error.message}`);
  }
};
class YouTubeDownloader {
  constructor(provider = 1) {
    this.providers = [{
      name: "v1.ytdownloader.click",
      url: "https://v1.ytdownloader.click/mates/en/analyze/ajax",
      referer: "https://v1.ytdownloader.click/"
    }, {
      name: "yt5s.biz",
      url: "https://yt5s.biz/mates/en/analyze/ajax",
      referer: "https://yt5s.biz/"
    }];
    this.provider = this.providers[provider - 1] || this.providers[0];
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async analyzeVideo(url) {
    const requestData = `url=${encodeURIComponent(url)}&q_auto=0&ajax=1&lang=en`;
    try {
      const response = await axios.post(this.provider.url, requestData, {
        headers: {
          ...this.headers,
          Referer: this.provider.referer
        }
      });
      const result = response.data?.result;
      if (result) {
        const json = await htmlToJson(result);
        return {
          json: json,
          html: result
        };
      } else {
        throw new Error("No result found in the response data");
      }
    } catch (error) {
      console.error("Error during the request:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    provider
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Invalid YouTube URL"
    });
  }
  const downloader = new YouTubeDownloader(provider);
  try {
    const data = await downloader.analyzeVideo(url);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error processing the YouTube URL"
    });
  }
}