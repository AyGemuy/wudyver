import axios from "axios";
class YouTubeDownloader {
  constructor({
    baseUrl = "https://ytmp3.cx",
    headers = {}
  } = {}) {
    this.url = {
      origin: baseUrl || "https://ytmp3.cx"
    };
    this.baseHeaders = {
      "accept-encoding": "gzip, deflate, br, zstd",
      ...headers
    };
    console.log("YouTubeDownloader initialized with baseUrl:", this.url.origin);
  }
  extractVideoId(url) {
    console.log("Extracting video ID from:", url);
    try {
      let videoId;
      if (url?.includes("youtu.be")) {
        videoId = /\/([a-zA-Z0-9\-\_]{11})/.exec(url)?.[1];
      } else if (url?.includes("youtube.com")) {
        if (url.includes("/shorts/")) {
          videoId = /\/([a-zA-Z0-9\-\_]{11})/.exec(url)?.[1];
        } else {
          videoId = /v\=([a-zA-Z0-9\-\_]{11})/.exec(url)?.[1];
        }
      }
      if (!videoId) throw new Error("Failed to extract video ID");
      console.log("Extracted video ID:", videoId);
      return videoId;
    } catch (error) {
      console.error("Error extracting video ID:", error.message);
      throw error;
    }
  }
  async getInitUrl() {
    console.log("Fetching initial URL configuration");
    try {
      const homepageResponse = await axios.get(this.url.origin, {
        headers: this.baseHeaders
      });
      console.log("Successfully fetched homepage");
      const html = homepageResponse?.data;
      const jsPath = html?.match(/<script src="(.+?)"/)?.[1];
      if (!jsPath) throw new Error("Failed to extract JS path");
      const jsUrl = `${this.url.origin}${jsPath}`;
      const jsResponse = await axios.get(jsUrl, {
        headers: this.baseHeaders
      });
      console.log("Successfully fetched JS file");
      const jsContent = jsResponse?.data;
      const gBMatch = jsContent?.match(/gB=(.+?),gD/)?.[1];
      if (!gBMatch) throw new Error("Failed to extract gB");
      const gB = eval(gBMatch);
      const htmlMatch = html?.match(/<script>(.+?)<\/script>/)?.[1];
      if (!htmlMatch) throw new Error("Failed to extract gC script");
      const hiddenGc = eval(htmlMatch + "gC");
      const gC = Object.fromEntries(Object.getOwnPropertyNames(hiddenGc || {}).map(key => [key, hiddenGc[key]]));
      const decodeBin = d => d.split(" ").map(v => parseInt(v, 2));
      const decodeHex = d => d.match(/0x[a-fA-F0-9]{2}/g)?.map(v => String.fromCharCode(v)).join("") || "";
      const getTimestamp = () => Math.floor(Date.now() / 1e3);
      const authorization = () => {
        try {
          const dec = decodeBin(gC.d(1)[0]);
          let k = "";
          for (let i = 0; i < dec.length; i++) {
            k += gC.d(2)[0] > 0 ? atob(gC.d(1)[1]).split("").reverse().join("")[dec[i] - gC.d(2)[1]] : atob(gC.d(1)[1])[dec[i] - gC.d(2)[1]];
          }
          if (gC.d(2)[2] > 0) k = k.substring(0, gC.d(2)[2]);
          switch (gC.d(2)[3]) {
            case 0:
              return btoa(k + "_" + decodeHex(gC.d(3)[0]));
            case 1:
              return btoa(k.toLowerCase() + "_" + decodeHex(gC.d(3)[0]));
            case 2:
              return btoa(k.toUpperCase() + "_" + decodeHex(gC.d(3)[0]));
            default:
              throw new Error("Invalid authorization case");
          }
        } catch (error) {
          console.error("Authorization error:", error.message);
          throw error;
        }
      };
      const apiMatch = jsContent?.matchAll(/};var \S{1}=(.+?);gR&&\(/g);
      const apiExpression = Array.from(apiMatch)?.[1]?.[1];
      if (!apiExpression) throw new Error("Failed to extract API URL");
      const apiUrl = eval(apiExpression);
      console.log("Successfully extracted API URL:", apiUrl);
      return apiUrl;
    } catch (error) {
      console.error("Error in getInitUrl:", error.message);
      throw new Error(`Failed to fetch initial URL: ${error.message}`);
    }
  }
  async download({
    url,
    format = "mp3",
    ...rest
  } = {}) {
    console.log("Starting download process with URL:", url, "Format:", format);
    try {
      if (!/^mp3|mp4$/.test(format)) {
        throw new Error("Invalid format. Must be mp3 or mp4");
      }
      const videoId = this.extractVideoId(url);
      const headers = {
        referer: this.url.origin,
        ...this.baseHeaders,
        ...rest.headers
      };
      const initApi = await this.getInitUrl();
      console.log("Fetching init API:", initApi);
      const initResponse = await axios.get(initApi, {
        headers: headers
      });
      console.log("Successfully fetched init API");
      const {
        convertURL
      } = initResponse?.data || {};
      if (!convertURL) throw new Error("Convert URL not found");
      const convertApi = `${convertURL}&v=${videoId}&f=${format}&_=${Math.random()}`;
      console.log("Fetching convert API:", convertApi);
      const convertResponse = await axios.get(convertApi, {
        headers: headers
      });
      console.log("Successfully fetched convert API");
      const convertData = convertResponse?.data || {};
      if (convertData.error) {
        throw new Error(`Convert API error: ${JSON.stringify(convertData, null, 2)}`);
      }
      if (convertData.redirectURL) {
        console.log("Fetching redirect URL:", convertData.redirectURL);
        const redirectResponse = await axios.get(convertData.redirectURL, {
          headers: headers
        });
        console.log("Successfully fetched redirect URL");
        const redirectData = redirectResponse?.data || {};
        return {
          title: redirectData.title || "Unknown Title",
          downloadURL: redirectData.downloadURL || "",
          format: format
        };
      } else {
        console.log("Entering progress polling loop");
        let progressData;
        do {
          console.log("Checking progress:", convertData.progressURL);
          const progressResponse = await axios.get(convertData.progressURL, {
            headers: headers
          });
          progressData = progressResponse?.data || {};
          if (progressData.error) {
            throw new Error(`Progress check error: ${JSON.stringify(progressData, null, 2)}`);
          }
          if (progressData.progress === 3) {
            console.log("Download ready");
            return {
              title: progressData.title || "Unknown Title",
              downloadURL: convertData.downloadURL || "",
              format: format
            };
          }
          console.log("Waiting for progress update...");
          await new Promise(resolve => setTimeout(resolve, 3e3));
        } while (progressData.progress !== 3);
      }
    } catch (error) {
      console.error("Error in download process:", error.message);
      throw new Error(`Download failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "url are required"
    });
  }
  try {
    const downloader = new YouTubeDownloader();
    const response = await downloader.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}