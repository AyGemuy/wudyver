import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import qs from "qs";
class SpotisongDownloader {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://spotisongdownloader.to",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "id-ID,id;q=0.9",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        Referer: "https://spotisongdownloader.to/track.php",
        Origin: "https://spotisongdownloader.to",
        "X-Requested-With": "XMLHttpRequest",
        Priority: "u=1, i"
      },
      jar: this.jar,
      withCredentials: true
    }));
  }
  async getCookies() {
    try {
      const response = await this.client.get("/");
      const setCookie = response.headers["set-cookie"] || [];
      const PHPSESSID = setCookie.find(c => c.includes("PHPSESSID"))?.split(";")[0] || "";
      const quality = setCookie.find(c => c.includes("quality"))?.split(";")[0] || "";
      this.cookies = `${PHPSESSID}; ${quality}`;
      return this.cookies;
    } catch (error) {
      console.error("Gagal mengambil cookie:", error.message);
      return "";
    }
  }
  async getSongData(url) {
    try {
      if (!this.cookies) await this.getCookies();
      const response = await this.client.get(`/api/composer/spotify/xsingle_track.php?url=${encodeURIComponent(url)}`, {
        headers: {
          Cookie: this.cookies
        }
      });
      const {
        data
      } = response;
      if (!data || !data.song_name || !data.artist || !data.url) return null;
      const output = await this.downloadSong(data);
      return {
        ...data,
        ...output
      };
    } catch (error) {
      console.error("Error mendapatkan data lagu:", error.message);
      return null;
    }
  }
  async downloadSong(songData) {
    try {
      const payload = qs.stringify({
        song_name: songData.song_name,
        artist_name: songData.artist,
        url: songData.url
      });
      const {
        data
      } = await this.client.post("/api/composer/spotify/wertyuht9847635.php", payload, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Cookie: this.cookies
        }
      });
      return data;
    } catch (error) {
      console.error("Error mengunduh lagu:", error.message);
      return null;
    }
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
    const spotify = new SpotisongDownloader();
    const result = await spotify.getSongData(url);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}