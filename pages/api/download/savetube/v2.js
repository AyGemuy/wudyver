import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class VideoLinkFetcher {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.hosts = ["save.tube", "youtube4kdownloader.com"];
    this.chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz";
  }
  convert(text, mode, iterations) {
    text = String(text);
    for (let i = 1; i <= iterations; i++) {
      let result = "";
      for (let char of text) {
        let pos = this.chars.indexOf(char);
        if (pos === -1) {
          result += char;
        } else {
          let newPos = mode === "enc" ? (pos + 5) % this.chars.length : (pos - 5 + this.chars.length) % this.chars.length;
          result += this.chars[newPos];
        }
      }
      text = result.split("").reverse().join("");
    }
    return text;
  }
  decodeMax(input) {
    try {
      let decoded = input;
      for (let i = 0; i < 10; i++) {
        let newDecoded = decodeURIComponent(decoded);
        if (newDecoded === decoded) break;
        decoded = newDecoded;
      }
      return decoded;
    } catch {
      return input;
    }
  }
  generateRand(input) {
    const ytUrlDecoded = this.decodeMax(input);
    let result = this.convert(ytUrlDecoded, "dec", 3);
    return result.replace(/[^0-9a-z]/gi, "").substring(0, 15);
  }
  async fetchData(url) {
    try {
      const {
        data
      } = await this.client.get(url, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID,id;q=0.9",
          Connection: "keep-alive",
          "Content-type": "application/x-www-form-urlencoded",
          Cookie: "_ga=GA1.1.1204876675.1740501303; _ym_uid=1740501303367216781; _ym_d=1740501303; _ym_isad=1; _ym_visorc=b; langc=en; _ga_QJDV8H5QRY=GS1.1.1740501302.1.1.1740502656.0.0.0",
          Referer: "https://save.tube/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      return data;
    } catch (error) {
      console.error("Error fetching links:", error.message);
      throw error;
    }
  }
  async download(videoUrl, hostIndex = 0) {
    const host = this.hosts[hostIndex] || this.hosts[0];
    const apiUrl = `https://${host}/ajax/getLinks.php`;
    const randomString = this.generateRand(videoUrl);
    let response = await this.fetchData(`${apiUrl}?video=${encodeURIComponent(videoUrl)}&rand=${randomString}`);
    while (response && response.status === "red" && response.data) {
      console.log(`Redirecting to: ${response.data}`);
      response = await this.fetchData(response.data);
    }
    return response.data ? response.data : response;
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      host
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new VideoLinkFetcher();
    const result = await downloader.download(url, host);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}