import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class SpotifyDownloader {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "id-ID,id;q=0.9",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      },
      withCredentials: true
    }));
  }
  async getCookie(url) {
    try {
      await this.client.get(url);
      return this.jar.getCookiesSync(url).map(c => `${c.key}=${c.value}`).join("; ");
    } catch (error) {
      console.error("Error getting cookies:", error.message);
      return "";
    }
  }
  cleanText(text) {
    return text.replace(/&amp;/g, "&").replace(/[^\w\s-]/g, "").trim();
  }
  async getTrackInfo(url) {
    try {
      const siteUrl = "https://spotisongdownloader.to/";
      const cookies = await this.getCookie(siteUrl);
      const {
        data
      } = await this.client.get("https://spotisongdownloader.to/api/composer/spotify/xsingle_track.php", {
        params: {
          url: url
        },
        headers: {
          cookie: cookies,
          referer: siteUrl,
          "sec-fetch-mode": "cors"
        }
      });
      if (data.res !== 200) {
        console.error("Invalid response from API:", data);
        return null;
      }
      return {
        ...data,
        song_name: this.cleanText(data.song_name),
        artist: this.cleanText(data.artist)
      };
    } catch (error) {
      console.error("Error fetching track info:", error.message);
      return null;
    }
  }
  async getDownloadLink(trackInfo) {
    try {
      if (!trackInfo || !trackInfo.song_name || !trackInfo.artist) return null;
      const siteUrl = "https://spotisongdownloader.to/track.php";
      const cookies = await this.getCookie(siteUrl);
      const form = new URLSearchParams();
      form.append("song_name", trackInfo.song_name);
      form.append("artist_name", trackInfo.artist);
      form.append("url", trackInfo.url || "");
      const {
        data
      } = await this.client.post("https://spotisongdownloader.to/api/composer/spotify/wertyuht3456.php", form, {
        headers: {
          cookie: cookies,
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: "https://spotisongdownloader.to",
          referer: siteUrl
        }
      });
      return data;
    } catch (error) {
      console.error("Error fetching download link:", error.message);
      return null;
    }
  }
  async downloadSpotifyTrack(url) {
    const trackInfo = await this.getTrackInfo(url);
    if (!trackInfo) return {
      error: "Track not found"
    };
    const downloadData = await this.getDownloadLink(trackInfo);
    return downloadData ? {
      ...trackInfo,
      ...downloadData
    } : {
      error: "Failed to fetch download link"
    };
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing required query parameter: url"
    });
  }
  try {
    const spotify = new SpotifyDownloader();
    const result = await spotify.downloadSpotifyTrack(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Handler Error:", error.message);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}