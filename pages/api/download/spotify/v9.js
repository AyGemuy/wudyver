import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class SpotifyDown {
  constructor() {
    this.client = wrapper(axios.create({
      baseURL: "https://spotify-down.com/api",
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        Connection: "keep-alive",
        "Content-Type": "application/json",
        Origin: "https://spotify-down.com",
        Referer: "https://spotify-down.com/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      },
      jar: new CookieJar(),
      withCredentials: true
    }));
  }
  async getTrackInfo(url) {
    try {
      const {
        data
      } = await this.client.post("/metadata", null, {
        params: {
          link: url
        }
      });
      if (!data?.data?.title || !data?.data?.artists) throw new Error();
      return {
        ...data.data,
        file: await this.downloadTrack(data.data)
      };
    } catch {
      return {
        error: "Gagal mengambil info lagu"
      };
    }
  }
  async downloadTrack({
    link,
    title,
    artists
  }) {
    try {
      const {
        data
      } = await this.client.get("/download", {
        params: {
          link: link,
          n: title,
          a: artists
        }
      });
      return data?.data?.link || null;
    } catch {
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
    const spotify = new SpotifyDown();
    const result = await spotify.getTrackInfo(url);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}