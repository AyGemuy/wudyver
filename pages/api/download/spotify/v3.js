import axios from "axios";
class SpotifyDownloader {
  constructor(options = {}) {
    this.baseUrl = "https://spotisongdownloader.to";
    this.timeout = options.timeout || 3e4;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1e3;
    this.client = axios.create({
      timeout: this.timeout,
      headers: this.getBaseHeaders(),
      validateStatus: status => status < 500
    });
    this.setupInterceptors();
  }
  getBaseHeaders() {
    return {
      "accept-encoding": "gzip, deflate, br, zstd",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.5"
    };
  }
  setupInterceptors() {
    this.client.interceptors.request.use(config => {
      console.log(`🚀 [REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    }, error => {
      console.error("❌ [REQUEST ERROR]", error.message);
      return Promise.reject(error);
    });
    this.client.interceptors.response.use(response => {
      console.log(`✅ [RESPONSE] ${response.status} ${response.config.url}`);
      return response;
    }, error => {
      const status = error.response?.status || "NETWORK_ERROR";
      const url = error.config?.url || "unknown";
      console.error(`❌ [RESPONSE ERROR] ${status} ${url} - ${error.message}`);
      return Promise.reject(error);
    });
  }
  async makeRequest(description, config, returnType = "text") {
    let lastError;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`🔄 [ATTEMPT ${attempt}/${this.retryAttempts}] ${description}`);
        const response = await this.client(config);
        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        let data;
        if (returnType === "json") {
          data = response.data;
          if (typeof data === "string") {
            data = JSON.parse(data);
          }
        } else {
          data = response.data;
        }
        console.log(`✨ [SUCCESS] ${description} completed`);
        return {
          data: data,
          response: response
        };
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ [RETRY] ${description} failed (attempt ${attempt}): ${error.message}`);
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * attempt;
          console.log(`⏳ [DELAY] Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }
    throw new Error(`${description} failed after ${this.retryAttempts} attempts: ${lastError.message}`);
  }
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  validateSpotifyUrl(url) {
    const spotifyRegex = /^https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]{22}(\?.*)?$/;
    if (!spotifyRegex.test(url)) {
      throw new Error("Invalid Spotify track URL format");
    }
    console.log("✅ [VALIDATION] Spotify URL is valid");
  }
  async getCookie() {
    console.log("🍪 [STEP 1] Getting cookie from homepage...");
    const config = {
      method: "GET",
      url: this.baseUrl,
      headers: this.getBaseHeaders()
    };
    const {
      response
    } = await this.makeRequest("get cookie", config);
    const setCookieHeader = response.headers["set-cookie"];
    if (!setCookieHeader || !setCookieHeader.length) {
      throw new Error("No set-cookie header found in response");
    }
    let cookie = setCookieHeader[0].split(";")[0];
    if (!cookie) {
      throw new Error("Failed to extract cookie from set-cookie header");
    }
    cookie += "; _ga=GA1.1.2675401.1754827078";
    console.log("✅ [COOKIE] Successfully obtained session cookie");
    return {
      cookie: cookie
    };
  }
  async validateCookie(cookieObj) {
    console.log("🔐 [STEP 2] Validating cookie...");
    const config = {
      method: "GET",
      url: `${this.baseUrl}/ifCaptcha.php`,
      headers: {
        ...this.getBaseHeaders(),
        referer: this.baseUrl,
        cookie: cookieObj.cookie
      }
    };
    await this.makeRequest("validate cookie", config);
    const validatedHeaders = {
      ...this.getBaseHeaders(),
      referer: this.baseUrl,
      cookie: cookieObj.cookie
    };
    console.log("✅ [VALIDATION] Cookie validated successfully");
    return validatedHeaders;
  }
  async getTrackMetadata(spotifyUrl, headers) {
    console.log("📋 [STEP 3] Fetching track metadata...");
    const config = {
      method: "GET",
      url: `${this.baseUrl}/api/composer/spotify/xsingle_track.php`,
      headers: headers,
      params: {
        url: spotifyUrl
      }
    };
    const {
      data
    } = await this.makeRequest("get track metadata", config, "json");
    const requiredFields = ["song_name", "artist", "duration", "img", "url", "album_name", "released"];
    for (const field of requiredFields) {
      if (!data[field]) {
        console.warn(`⚠️ [METADATA] Missing field: ${field}`);
      }
    }
    console.log(`✅ [METADATA] Track: "${data.song_name}" by ${data.artist}`);
    return data;
  }
  async submitTrackData(trackData, headers) {
    console.log("📤 [STEP 4] Submitting track data...");
    const payload = [trackData.song_name, trackData.duration, trackData.img, trackData.artist, trackData.url, trackData.album_name, trackData.released];
    const config = {
      method: "POST",
      url: `${this.baseUrl}/track.php`,
      headers: {
        ...headers,
        "content-type": "application/x-www-form-urlencoded"
      },
      data: new URLSearchParams({
        data: JSON.stringify(payload)
      }).toString()
    };
    await this.makeRequest("submit track data", config);
    console.log("✅ [SUBMIT] Track data submitted successfully");
  }
  async getDownloadUrl(spotifyUrl, headers, trackData, downloadOptions = {}) {
    console.log("🎵 [STEP 5] Getting download URL...");
    const {
      quality = "m4a",
        zipDownload = false,
        songName = "",
        artistName = "", ...additionalOptions
    } = downloadOptions;
    console.log(`🎚️ [CONFIG] Quality: ${quality}, Zip: ${zipDownload}`);
    const formData = new URLSearchParams({
      song_name: songName,
      artist_name: artistName,
      url: spotifyUrl,
      zip_download: zipDownload.toString(),
      quality: quality,
      ...additionalOptions
    });
    const config = {
      method: "POST",
      url: `${this.baseUrl}/api/composer/spotify/ssdw23456ytrfds.php`,
      headers: {
        ...headers,
        "content-type": "application/x-www-form-urlencoded"
      },
      data: formData.toString()
    };
    const {
      data
    } = await this.makeRequest("get download URL", config, "json");
    const result = {
      ...data,
      ...trackData
    };
    if (result.status === "success" && result.dlink) {
      console.log("✅ [DOWNLOAD URL] Successfully obtained download link");
    } else {
      throw new Error("Failed to get valid download URL");
    }
    return result;
  }
  async download({
    url,
    quality = "m4a",
    zipDownload = false,
    ...options
  }) {
    console.log("🎯 [START] Beginning Spotify track download process...");
    console.log(`🔗 [URL] ${url}`);
    console.log(`🎵 [QUALITY] ${quality}`);
    console.log(`📦 [ZIP] ${zipDownload ? "enabled" : "disabled"}`);
    if (Object.keys(options).length > 0) {
      console.log("⚙️ [OPTIONS]", options);
    }
    try {
      this.validateSpotifyUrl(url);
      const cookieObj = await this.getCookie();
      const headers = await this.validateCookie(cookieObj);
      const trackData = await this.getTrackMetadata(url, headers);
      await this.submitTrackData(trackData, headers);
      const downloadData = await this.getDownloadUrl(url, headers, trackData, {
        quality: quality,
        zipDownload: zipDownload,
        ...options
      });
      console.log("🎉 [COMPLETE] Download process completed successfully!");
      console.log(`🎵 Track: ${downloadData.song_name} - ${downloadData.artist}`);
      console.log(`💿 Album: ${downloadData.album_name} (${downloadData.released})`);
      console.log(`🔗 Download: ${downloadData.dlink}`);
      return downloadData;
    } catch (error) {
      console.error("💥 [ERROR] Download process failed:", error.message);
      throw error;
    }
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
    const downloader = new SpotifyDownloader();
    const response = await downloader.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}