import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class SpotyAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      Origin: "https://spotify.musicdown.co",
      Referer: "https://spotify.musicdown.co/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async download(url) {
    try {
      const metadataResponse = await this.client.post("https://spotify.musicdown.co/api/get-metadata", {
        url: url
      }, {
        headers: this.headers
      });
      const downloadResponse = await this.client.post("https://spotify.musicdown.co/api/download-track", {
        url: url
      }, {
        headers: this.headers
      });
      return {
        ...metadataResponse.data,
        ...downloadResponse.data
      };
    } catch (error) {
      console.error("Error in download operation:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL is required"
    });
  }
  const spotyAPI = new SpotyAPI();
  try {
    const result = await spotyAPI.download(url);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "An error occurred while processing the request."
    });
  }
}