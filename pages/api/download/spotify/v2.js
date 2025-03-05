import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class Spowload {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar()
    }));
    this.headers = {
      authority: "spowload.com",
      accept: "*/*",
      "user-agent": "Postify/1.0.0",
      "content-type": "application/json",
      origin: "https://spowload.com",
      referer: "https://spowload.com"
    };
  }
  validateLink(link) {
    const regex = /^(?:https?:\/\/)?(?:open\.)?spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]{22})(?:\?.*)?$/;
    const idRegex = /^[a-zA-Z0-9]{22}$/;
    if (!link) throw new Error("Link Spotify tidak ditemukan!");
    const match = link.match(regex);
    if (!match) {
      if (idRegex.test(link)) return link;
      throw new Error("Link Spotify tidak valid!");
    }
    if (match[1] !== "track") throw new Error("Hanya Spotify Track yang didukung!");
    return link;
  }
  async fetchMetadata(link) {
    try {
      const idMatch = link.match(/track\/([a-zA-Z0-9]{22})/);
      const trackId = idMatch ? idMatch[1] : null;
      if (!trackId) throw new Error("ID Spotify tidak ditemukan!");
      const {
        data: html
      } = await this.client.get(`https://spowload.com/spotify/track-${trackId}`);
      const $ = cheerio.load(html);
      const csrfToken = $('meta[name="csrf-token"]').attr("content");
      let urldata = null;
      $("script").each((_, script) => {
        const scriptContent = $(script).html();
        const match = scriptContent.match(/let urldata = "(.*?)";/);
        if (match) {
          urldata = match[1].replace(/\\\"/g, '"');
          return false;
        }
      });
      if (!urldata) throw new Error("Metadata tidak ditemukan!");
      return {
        metadata: JSON.parse(urldata),
        csrfToken: csrfToken
      };
    } catch (error) {
      throw new Error(`Gagal mengambil metadata: ${error.message}`);
    }
  }
  async analyzeTrack(link, csrfToken) {
    try {
      const response = await this.client.post("https://spowload.com/analyze", new URLSearchParams({
        _token: csrfToken,
        trackUrl: link
      }), {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8"
        },
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      return response.headers.location || response.request.res.responseUrl;
    } catch (error) {
      const redirect = error.response?.headers?.location;
      if (!redirect) throw new Error(`Analisis gagal: ${error.message}`);
      return redirect;
    }
  }
  async convertTrack(link, metadata, csrfToken) {
    try {
      const {
        data
      } = await this.client.post("https://spowload.com/convert", {
        urls: link,
        cover: metadata.album.images[0].url
      }, {
        headers: {
          ...this.headers,
          "x-csrf-token": csrfToken
        }
      });
      if (!data || !data.url) throw new Error("Gagal mengonversi track.");
      return data;
    } catch (error) {
      throw new Error(`Konversi gagal: ${error.message}`);
    }
  }
  async create(link) {
    try {
      link = this.validateLink(link);
      const {
        metadata,
        csrfToken
      } = await this.fetchMetadata(link);
      const redirect = await this.analyzeTrack(link, csrfToken);
      const convert = await this.convertTrack(link, metadata, csrfToken);
      return {
        status: true,
        metadata: metadata,
        analyze: {
          redirect: redirect
        },
        download: {
          url: convert.url
        }
      };
    } catch (error) {
      return {
        status: false,
        error: error.message
      };
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
    const spowload = new Spowload();
    const result = await spowload.create(url);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      status: false,
      error: error.message
    });
  }
}