import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class SoundCloudDownloader {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true
    }));
    this.headers = {
      accept: "text/html",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://soundcloudtomp3.biz",
      referer: "https://soundcloudtomp3.biz/",
      "user-agent": "Mozilla/5.0"
    };
  }
  async fetchFormToken() {
    try {
      const response = await this.client.get("https://soundcloudtomp3.biz/", {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      return $('input[name="formToken"]').val();
    } catch (error) {
      console.error("Error fetching form token:", error);
      throw new Error("Failed to fetch form token");
    }
  }
  async downloadTrack(url, quality = "128") {
    try {
      const formToken = await this.fetchFormToken();
      const postData = new URLSearchParams({
        videoURL: url,
        quality: quality,
        formToken: formToken,
        submit: "Create MP3 File"
      });
      const response = await this.client.post("https://soundcloudtomp3.biz/index.php", postData, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const scripts = $("script").map((i, el) => $(el).html()).get();
      let mp3File = null;
      let trackName = null;
      let previewImage = null;
      $("#preview").each((i, el) => {
        trackName = $(el).find("p").eq(2).text().trim() || $(el).find("p").eq(0).text().trim();
        previewImage = $(el).find("img").eq(0).attr("src");
      });
      scripts.forEach(scriptContent => {
        const match = scriptContent && scriptContent.match(/mpc_showConversionResult\("(.*?)", 1\)/);
        if (match) {
          mp3File = match[1];
        }
      });
      if (mp3File) {
        const logResponse = await this.client.post("https://soundcloudtomp3.biz/ffmpeg_progress.php", new URLSearchParams({
          uniqueId: "1741530828_67cda6cc6948a2.20249023",
          logLength: 0,
          mp3File: encodeURI(mp3File)
        }), {
          headers: this.headers
        });
        console.log("Log Response: ", logResponse.data);
        return {
          downloadLink: `https://soundcloudtomp3.biz/index.php?mp3=${encodeURI(mp3File)}`,
          trackName: trackName,
          previewImage: previewImage,
          logResponse: logResponse.data
        };
      } else {
        throw new Error("Failed to retrieve mp3 file.");
      }
    } catch (error) {
      console.error("Error during download process: ", error);
      throw new Error("Error downloading track");
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      quality
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new SoundCloudDownloader();
    const result = await downloader.downloadTrack(url, quality);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}