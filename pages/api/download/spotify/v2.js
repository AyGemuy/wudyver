import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class SpowloadAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://spowload.com",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://spowload.com",
        referer: "https://spowload.com/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      },
      jar: this.cookieJar,
      withCredentials: true
    }));
  }
  async fetchHtml(url) {
    try {
      const {
        data
      } = await this.client.get(url);
      return data;
    } catch {
      return null;
    }
  }
  parseCsrfToken(html) {
    return cheerio.load(html)('meta[name="csrf-token"]').attr("content") || "";
  }
  parseSpotifyId(url) {
    return url.match(/(?:track\/|track%3A)([a-zA-Z0-9]+)/)?.[1] || null;
  }
  async getTrackData(url) {
    try {
      const data = await this.fetchHtml(url);
      if (!data) return null;
      const $ = cheerio.load(data);
      const urldataMatch = [...$("script")].map(el => $(el).html()).find(script => script.includes("let urldata ="));
      const rawJson = urldataMatch?.match(/let urldata = "(.*?)";/)?.[1];
      return rawJson ? {
        parsedData: JSON.parse(rawJson.replace(/\\"/g, '"').replace(/"\{/g, "{").replace(/\}"/g, "}").replace(/"\[/g, "[").replace(/\]"/g, "]").replace(/\\\\\//g, "/")),
        data: data
      } : null;
    } catch {
      return null;
    }
  }
  async fetchTrackInfo(spotifyUrl) {
    try {
      const id = this.parseSpotifyId(spotifyUrl);
      if (!id) throw new Error("Invalid Spotify URL");
      const res = await this.getTrackData(`https://spowload.com/spotify/track-${id}`);
      if (!res) return null;
      const {
        parsedData,
        data
      } = res;
      const conversionData = await this.convertUrlToJson(spotifyUrl, parsedData?.album?.images?.[0]?.url || "", this.parseCsrfToken(data));
      return {
        ...parsedData,
        ...conversionData
      };
    } catch (error) {
      console.error("Error fetching track info:", error);
      return null;
    }
  }
  async convertUrlToJson(spotifyUrl, coverImage, csrfToken) {
    try {
      const {
        data
      } = await this.client.post("/convert", {
        urls: spotifyUrl,
        cover: coverImage
      }, {
        headers: {
          "content-type": "application/json",
          cookie: this.cookieJar.getCookieString("https://spowload.com"),
          "x-csrf-token": csrfToken
        }
      });
      return data;
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
      error: "URL is required"
    });
  }
  const spowload = new SpowloadAPI();
  try {
    const result = await spowload.fetchTrackInfo(url);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "An error occurred while processing the request."
    });
  }
}