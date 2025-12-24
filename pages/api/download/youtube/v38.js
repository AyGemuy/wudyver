import axios from "axios";
import crypto from "crypto";
class VideoDownloader {
  constructor() {
    this.apiEndpoint = "https://api5.apiapi.lat";
    this.restrictedTimezones = new Set(["-330", "-420", "-480", "-540"]);
    this.userTimeZone = new Date().getTimezoneOffset().toString();
    this.downloadLimit = this.restrictedTimezones.has(this.userTimeZone) ? 5 : 100;
  }
  setApiEndpoint(host) {
    this.apiEndpoint = host === "1" ? "https://api5.apiapi.lat" : host === "128" ? "https://api.apiapi.lat" : "https://api3.apiapi.lat";
  }
  async logError(error, source) {
    try {
      await axios.post(`${this.apiEndpoint}/error-log/`, {
        error: error.toString(),
        source: source,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase()
      });
    } catch {}
  }
  isValidUrl(url) {
    try {
      const parsedUrl = new URL(url);
      const validHostnames = [/^(.+\.)?youtube\.com$/, /^(.+\.)?youtube-nocookie\.com$/, /^youtu\.be$/, /^(.+\.)?googlevideo\.com$/, /^(.+\.)?google\.com$/];
      return validHostnames.some(regex => regex.test(parsedUrl.hostname.toLowerCase()));
    } catch {
      return false;
    }
  }
  xorEncode(str) {
    return Array.from(str).map(char => String.fromCharCode(char.charCodeAt(0) ^ 1)).join("");
  }
  generateRandomHash() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, byte => byte.toString(16).padStart(2, "0")).join("");
  }
  encodeUrl(url, separator = ",") {
    return url.split("").map(char => char.charCodeAt(0)).reverse().join(separator);
  }
  encodeFinalUrl(url) {
    return encodeURIComponent(this.xorEncode(url));
  }
  async checkStatus(id) {
    try {
      const url = `${this.apiEndpoint}/${this.generateRandomHash()}/status/${this.encodeUrl(id)}/${this.generateRandomHash()}/`;
      const {
        data
      } = await axios.post(url, {
        data: id
      });
      return data;
    } catch (error) {
      await this.logError(error, "checkStatus");
      return false;
    }
  }
  async initiateDownload(url, format, mp3Quality, mp4Quality) {
    try {
      const apiUrl = `${this.apiEndpoint}/${this.generateRandomHash()}/init/${this.encodeUrl(url)}/${this.generateRandomHash()}/`;
      const {
        data
      } = await axios.post(apiUrl, {
        data: this.xorEncode(url),
        format: format,
        mp3Quality: mp3Quality,
        mp4Quality: mp4Quality,
        userTimeZone: this.userTimeZone
      });
      return data;
    } catch (error) {
      await this.logError(error, "initiateDownload");
      return false;
    }
  }
  async waitForCompletion(id) {
    while (true) {
      const status = await this.checkStatus(id);
      if (status?.s === "C") return status;
      await new Promise(resolve => setTimeout(resolve, 2e3));
    }
  }
  async getDownloadLink(id) {
    return `${this.apiEndpoint}/${this.generateRandomHash()}/download/${this.encodeFinalUrl(id)}/${this.generateRandomHash()}/`;
  }
  async getVideoInfo(uniqueId) {
    try {
      const url = `${this.apiEndpoint}/get-video-info/${uniqueId}/`;
      const {
        data
      } = await axios.get(url);
      return data;
    } catch (error) {
      await this.logError(error, "getVideoInfo");
      return false;
    }
  }
  async downloadVideo({
    url,
    format = "mp4",
    mp3Quality = "128kbps",
    mp4Quality = "360p",
    host = "1"
  }) {
    this.setApiEndpoint(host);
    if (!this.isValidUrl(url)) throw new Error("Invalid URL.");
    const data = await this.initiateDownload(url, format, mp3Quality, mp4Quality);
    if (!data?.i) throw new Error("Failed to process video.");
    const status = await this.waitForCompletion(data.i);
    const videoInfo = await this.getVideoInfo(status.i);
    return {
      id: status.i,
      title: status.t,
      url: await this.getDownloadLink(status.i),
      ...videoInfo
    };
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new VideoDownloader();
    const result = await downloader.downloadVideo(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}