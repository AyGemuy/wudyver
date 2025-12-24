import axios from "axios";
class YouTubeDownloader {
  constructor() {
    this.baseUrl = "ecoe";
    this.apiFlag = 0;
    this.cryptoData = null;
    this.secretKeys = ["323", "a", "g", "q"];
  }
  log(message, data = null) {
    console.log(`[YT-Downloader] ${message}`);
    if (data) console.log(data);
  }
  async fetchPage() {
    try {
      this.log("Fetching initial page...");
      const response = await axios({
        method: "get",
        url: `https://ytmp3.cc/5Hcs/`,
        headers: {
          authority: "ytmp3.cc",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "max-age=0",
          "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
        }
      });
      this.log("Page fetched successfully");
      return response.data;
    } catch (error) {
      this.log(`Error fetching page: ${error.message}`);
      return null;
    }
  }
  getScript(html) {
    const regex = /<script>\s*eval\(atob\('([^']+)'\)\);\s*<\/script>/;
    const match = html.match(regex);
    if (match && match[1]) {
      this.log("Encrypted script found");
      return match[1];
    }
    this.log("Failed to extract encrypted script");
    return null;
  }
  decode(encoded) {
    return Buffer.from(encoded, "base64").toString("utf-8");
  }
  getCryptoObject(script) {
    try {
      const regex = /var g324=([^;]+);/;
      const match = script.match(regex);
      if (match && match[1]) {
        this.log("Crypto object found");
        return eval(`(${match[1]})`);
      }
    } catch (error) {
      this.log(`Error extracting crypto object: ${error.message}`);
    }
    return null;
  }
  generateToken() {
    if (!this.cryptoData) {
      this.log("Crypto data is not initialized");
      return false;
    }
    this.log("Generating authorization token...");
    this.cryptoData.d = this.cryptoData[this.secretKeys[1]];
    this.cryptoData.f = this.cryptoData[this.secretKeys[2]];
    this.cryptoData.t = this.cryptoData[this.secretKeys[3]];
    try {
      const decodedT0 = this.decode(this.cryptoData.t[0]);
      const evalResult = eval(decodedT0);
      if (evalResult != this.cryptoData.t[1]) {
        this.log("Authorization check failed");
        return false;
      }
      let key = this.cryptoData.f[6].split("").reverse().join("") + this.cryptoData.f[7];
      const decodedA0 = this.decode(this.cryptoData.d[0]);
      const splitted = decodedA0.split(this.cryptoData.f[5]);
      for (let c = 0; c < splitted.length; c++) {
        const charSource = 0 < this.cryptoData.f[4] ? this.cryptoData.d[1].split("").reverse().join("") : this.cryptoData.d[1];
        const idx = splitted[c] - this.cryptoData.f[3];
        key += charSource[idx];
      }
      if (1 == this.cryptoData.f[1]) {
        key = key.substring(0, this.cryptoData.f[6].length + this.cryptoData.f[7].length) + key.substring(this.cryptoData.f[6].length + this.cryptoData.f[7].length).toLowerCase();
      } else if (2 == this.cryptoData.f[1]) {
        key = key.substring(0, this.cryptoData.f[6].length + this.cryptoData.f[7].length) + key.substring(this.cryptoData.f[6].length + this.cryptoData.f[7].length).toUpperCase();
      }
      let token;
      if (0 < this.cryptoData.f[0].length) {
        token = Buffer.from(this.decode(this.cryptoData.f[0]).replace(String.fromCharCode(this.cryptoData.f[8]), "") + "_" + this.cryptoData.d[2]).toString("base64");
      } else if (0 < this.cryptoData.f[2]) {
        token = Buffer.from(key.substring(0, this.cryptoData.f[2] + (this.cryptoData.f[6].length + this.cryptoData.f[7].length)) + "_" + this.cryptoData.d[2]).toString("base64");
      } else {
        token = Buffer.from(key + "_" + this.cryptoData.d[2]).toString("base64");
      }
      this.log("Token generated successfully");
      return token;
    } catch (error) {
      this.log(`Error generating token: ${error.message}`);
      return false;
    }
  }
  async startConversion(videoId, format = "mp3") {
    try {
      const authToken = this.generateToken();
      if (!authToken) {
        this.log("Failed to generate authorization token");
        return null;
      }
      this.log(`Starting conversion for video ${videoId} in ${format} format...`);
      const response = await axios({
        method: "get",
        url: `https://d.${this.baseUrl}.cc/api/v1/init?a=${authToken}&_=${Math.random()}`,
        responseType: "json"
      });
      if (response.data.error > 0) {
        this.log(`API returned an error: ${response.data.error}`);
        return null;
      }
      this.log("Conversion initiated successfully");
      return response.data;
    } catch (error) {
      this.log(`Error starting conversion: ${error.message}`);
      return null;
    }
  }
  async convert(convertURL, videoId, format = "mp3") {
    try {
      if (convertURL.indexOf("&v=") > -1) {
        convertURL = convertURL.split("&v=")[0];
      }
      const url = `${convertURL}&v=${videoId}&f=${format}&_=${Math.random()}`;
      this.log(`Sending convert request to: ${url.substring(0, 50)}...`);
      const response = await axios({
        method: "get",
        url: url,
        responseType: "json"
      });
      if (response.data.error > 0) {
        this.log(`Convert API returned an error: ${response.data.error}`);
        return null;
      }
      if (response.data.redirect === 1) {
        this.log("Received redirect. Following redirect URL...");
        return await this.convert(response.data.redirectURL, videoId, format);
      }
      this.log("Conversion request successful");
      return response.data;
    } catch (error) {
      this.log(`Error in convert: ${error.message}`);
      return null;
    }
  }
  async checkProgress(progressURL) {
    try {
      const url = `${progressURL}&_=${Math.random()}`;
      this.log("Checking conversion progress...");
      const response = await axios({
        method: "get",
        url: url,
        responseType: "json"
      });
      if (response.data.error > 0) {
        this.log(`Progress API returned an error: ${response.data.error}`);
        return null;
      }
      this.log(`Current progress: ${response.data.progress}/3`);
      return response.data;
    } catch (error) {
      this.log(`Error checking progress: ${error.message}`);
      return null;
    }
  }
  getVideoId(url) {
    this.log(`Extracting video ID from URL: ${url}`);
    let match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    match = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    match = url.match(/\/v\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    match = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    match = url.match(/\/watch\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    match = url.match(/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }
    this.log("Failed to extract video ID");
    return null;
  }
  async directRequest(videoId, format = "mp3") {
    this.apiFlag = 1;
    try {
      const requestData = `{"url":"https://www.youtube.com/watch?v=${videoId}"}`;
      this.log(`Making direct API request for video ${videoId}...`);
      const response = await axios({
        method: "post",
        url: `https://${this.baseUrl}.cc/r/?_=${Math.random()}`,
        data: requestData,
        responseType: "json",
        timeout: 9e3
      });
      if (response.data.status === "ok" || response.data.status === "done") {
        this.log("Direct API request successful");
        return response.data;
      } else {
        this.log(`API returned an error status: ${response.data.status}`);
        return null;
      }
    } catch (error) {
      this.log(`Error in direct API request: ${error.message}`);
      return null;
    }
  }
  async process(url, format = "mp3") {
    try {
      const videoId = this.getVideoId(url);
      if (!videoId) {
        this.log("Invalid YouTube URL");
        return null;
      }
      this.log("Trying direct API method first...");
      const apiResult = await this.directRequest(videoId, format);
      if (apiResult) {
        this.log("Direct API method successful");
        return {
          title: apiResult.title,
          downloadUrl: apiResult.url,
          method: "direct_api"
        };
      }
      this.log("Direct API failed, trying full process method...");
      const initResult = await this.startConversion(videoId, format);
      if (!initResult) {
        this.log("Init conversion failed");
        return null;
      }
      const convertResult = await this.convert(initResult.convertURL, videoId, format);
      if (!convertResult) {
        this.log("Convert process failed");
        return null;
      }
      if (convertResult.progressURL) {
        let progress = 0;
        let progressResult = null;
        this.log("Waiting for conversion to complete...");
        while (progress < 3) {
          await new Promise(resolve => setTimeout(resolve, 3e3));
          progressResult = await this.checkProgress(convertResult.progressURL);
          if (!progressResult) {
            this.log("Progress check failed");
            break;
          }
          progress = progressResult.progress;
          if (progress >= 3) {
            this.log("Conversion completed successfully");
            break;
          }
        }
      }
      return {
        title: convertResult.title || "",
        downloadUrl: convertResult.downloadURL,
        method: "full_process"
      };
    } catch (error) {
      this.log(`Error processing URL: ${error.message}`);
      return null;
    }
  }
  async download({
    url,
    format = "mp4"
  }) {
    this.log(`Starting download process for URL: ${url} in ${format} format`);
    const html = await this.fetchPage();
    if (!html) return null;
    const encryptedScript = this.getScript(html);
    if (!encryptedScript) return null;
    const decodedScript = this.decode(encryptedScript);
    const cryptoObject = this.getCryptoObject(decodedScript);
    if (!cryptoObject) return null;
    this.cryptoData = cryptoObject;
    const result = await this.process(url, format);
    if (!result) {
      this.log("Download process failed");
      return null;
    }
    this.log("Download process completed successfully");
    this.log("Result:", result);
    return result;
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new YouTubeDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}