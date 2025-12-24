import axios from "axios";
import https from "https";
import crypto from "crypto";
import {
  FormData
} from "formdata-node";
import {
  URL
} from "url";
import SpoofHead from "@/lib/spoof-head";
class YouTubeDownloader {
  constructor() {
    this.baseURLs = {
      youtubemp3: "https://www.youtubemp3.ltd",
      oceansaver: "https://p.oceansaver.in"
    };
    this.sessionCookies = {};
    this.axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 45e3
    });
    this.axiosInstance.interceptors.request.use(config => {
      let currentBaseURL = "";
      for (const key in this.baseURLs) {
        if (config.url.startsWith(this.baseURLs[key])) {
          currentBaseURL = this.baseURLs[key];
          break;
        }
      }
      const spoofedHeaders = this.buildHeaders(currentBaseURL, config.headers);
      config.headers = {
        ...config.headers,
        ...spoofedHeaders
      };
      const domain = new URL(config.url).hostname;
      if (this.sessionCookies[domain]) {
        config.headers["cookie"] = this.sessionCookies[domain];
      }
      return config;
    }, error => {
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.response.use(response => {
      const setCookieHeaders = response.headers["set-cookie"];
      if (setCookieHeaders) {
        const domain = new URL(response.config.url).hostname;
        const newCookies = setCookieHeaders.map(s => s.split(";")[0]).join("; ");
        if (newCookies) {
          this.sessionCookies[domain] = newCookies;
        }
      }
      return response;
    }, error => {
      return Promise.reject(error);
    });
  }
  randomID(length = 8) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(currentBaseURL, extra = {}) {
    return {
      origin: currentBaseURL,
      referer: `${currentBaseURL}/`,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-request-id": this.randomID(),
      ...SpoofHead(),
      ...extra
    };
  }
  isValidYouTubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return youtubeRegex.test(url);
  }
  async download({
    url,
    type = "audio",
    ...rest
  }) {
    try {
      if (!this.isValidYouTubeUrl(url)) {
        console.log("Download failed: Invalid YouTube URL provided.");
        return {
          success: false,
          error: {
            message: "URL YouTube tidak valid!"
          }
        };
      }
      if (type === "audio") {
        console.log(`Starting audio download for: ${url}`);
        const result = await this.downloadMp3(url);
        if (result.success) {
          console.log(`Audio download completed for: ${url}`);
        } else {
          console.log(`Audio download failed for: ${url}`);
        }
        return result;
      } else if (type === "video") {
        const quality = rest.quality || "720";
        console.log(`Starting video download for: ${url} at ${quality}p`);
        const result = await this.downloadVideo(url, quality);
        if (result.success) {
          console.log(`Video download completed for: ${url} at ${quality}p`);
        } else {
          console.log(`Video download failed for: ${url} at ${quality}p`);
        }
        return result;
      } else {
        console.log(`Download failed: Invalid type specified: ${type}`);
        return {
          success: false,
          error: {
            message: "Tipe download tidak valid. Gunakan 'audio' atau 'video'."
          }
        };
      }
    } catch (outerError) {
      console.error(`An unexpected error occurred during download: ${outerError.message}`);
      return {
        success: false,
        error: {
          message: `Terjadi kesalahan yang tidak terduga: ${outerError.message}`
        }
      };
    }
  }
  async downloadMp3(url) {
    try {
      const ds = new FormData();
      ds.append("url", url);
      let attempts = 0;
      const maxAttempts = 5;
      let data;
      let error = null;
      while (attempts < maxAttempts) {
        attempts++;
        try {
          const response = await this.axiosInstance.post(`${this.baseURLs.youtubemp3}/convert`, ds, {
            headers: {
              ...ds.headers,
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            timeout: 45e3
          });
          data = response.data;
          break;
        } catch (e) {
          error = e;
          console.log(`YouTube MP3: Attempt ${attempts} failed for ${url}: ${e.message}`);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2e3));
          }
        }
      }
      if (!data || !data.link) {
        console.log(`YouTube MP3: No download link found after ${maxAttempts} attempts for ${url}`);
        return {
          success: false,
          error: {
            message: error?.response?.data?.message || error?.message || "Gagal mendapatkan link download MP3"
          }
        };
      }
      return {
        success: true,
        data: {
          title: data.filename || "Unknown Title",
          downloadUrl: data.link,
          type: "mp3"
        }
      };
    } catch (error) {
      if (error.code === "ECONNABORTED") {
        console.log(`YouTube MP3: Request timeout for ${url}`);
        return {
          success: false,
          error: {
            message: "Request timeout, coba lagi nanti"
          }
        };
      }
      console.error(`YouTube MP3: Error converting ${url} to MP3: ${error.message}`);
      return {
        success: false,
        error: {
          message: error.response?.data?.message || error.message || "Gagal convert YouTube ke MP3"
        }
      };
    }
  }
  async downloadVideo(url, quality) {
    try {
      const validQualityMap = {
        480: 480,
        1080: 1080,
        720: 720,
        360: 360
      };
      if (!Object.keys(validQualityMap).includes(quality)) {
        console.log(`YouTube Video: Invalid quality ${quality} for ${url}`);
        return {
          success: false,
          error: {
            message: "Kualitas video tidak valid!",
            availableQuality: Object.keys(validQualityMap)
          }
        };
      }
      const qualityValue = validQualityMap[quality];
      let firstRequestData;
      try {
        const response = await this.axiosInstance.get(`${this.baseURLs.oceansaver}/ajax/download.php?button=1&start=1&end=1&format=${qualityValue}&iframe_source=https://allinonetools.com/&url=${encodeURIComponent(url)}`, {
          timeout: 3e4,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        });
        firstRequestData = response.data;
      } catch (error) {
        console.error(`YouTube Video: Failed to start download process for ${url}: ${error.message}`);
        return {
          success: false,
          error: {
            message: `Gagal memulai proses download video: ${error.message}`
          }
        };
      }
      if (!firstRequestData || !firstRequestData.progress_url) {
        console.log(`YouTube Video: No progress URL found for ${url}`);
        return {
          success: false,
          error: {
            message: "Gagal memulai proses download video"
          }
        };
      }
      const {
        progress_url
      } = firstRequestData;
      let metadata = {
        image: firstRequestData.info?.image || "",
        title: firstRequestData.info?.title || "Unknown Title",
        downloadUrl: "",
        quality: quality,
        type: "mp4"
      };
      let pollingData;
      let attempts = 0;
      const maxAttempts = 40;
      const pollingDelayMs = 3e3;
      console.log(`YouTube Video: Processing download for ${url}...`);
      do {
        if (attempts >= maxAttempts) {
          console.log(`YouTube Video: Timeout for ${url}. Max attempts reached.`);
          return {
            success: false,
            error: {
              message: "Timeout: Proses download video terlalu lama, coba lagi"
            }
          };
        }
        await new Promise(resolve => setTimeout(resolve, pollingDelayMs));
        try {
          const response = await this.axiosInstance.get(progress_url, {
            timeout: 15e3,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          });
          pollingData = response.data;
          if (pollingData.progress && pollingData.progress < 100) {
            console.log(`YouTube Video: Progress for ${url}: ${pollingData.progress}%`);
          }
        } catch (pollError) {
          console.log(`YouTube Video: Polling attempt ${attempts + 1} failed for ${url}, retrying...`);
        }
        attempts++;
      } while (!pollingData?.download_url);
      if (!pollingData.download_url) {
        console.log(`YouTube Video: No download URL found after polling for ${url}`);
        return {
          success: false,
          error: {
            message: "Gagal mendapatkan URL download video"
          }
        };
      }
      metadata.downloadUrl = pollingData.download_url;
      console.log(`YouTube Video: Download ready for ${url}!`);
      return {
        success: true,
        data: metadata
      };
    } catch (error) {
      if (error.code === "ECONNABORTED") {
        console.log(`YouTube Video: Request timeout for ${url}`);
        return {
          success: false,
          error: {
            message: "Request timeout, coba lagi nanti"
          }
        };
      }
      console.error(`YouTube Video: Error downloading video for ${url}: ${error.message}`);
      return {
        success: false,
        error: {
          message: error.response?.data?.message || error.message || "Gagal download video"
        }
      };
    }
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