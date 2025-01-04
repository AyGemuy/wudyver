import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
const spowload = {
  create: async link => {
    const jar = new CookieJar();
    const client = wrapper(axios.create({
      jar: jar
    }));
    const spotLink = url => {
      if (!url) throw new Error("Link Spotify nya manaaaaa ??");
      const regex = /^(?:https?:\/\/)?(?:open\.)?spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]{22})(?:\?.*)?$/;
      const idx = /^[a-zA-Z0-9]{22}$/;
      const match = url.match(regex);
      if (!match) {
        if (idx.test(url)) return `${url}`;
        throw new Error("Link spotify nya kagak valid!!! Ganti kagak 🫵");
      }
      if (match[1] !== "track") throw new Error("Cuman Spotify Track doang yg di bolehin buat di download 🤣");
      return url;
    };
    const headers = {
      authority: "spowload.com",
      accept: "*/*",
      "user-agent": "Postify/1.0.0",
      "content-type": "application/json",
      origin: "https://spowload.com",
      referer: "https://spowload.com"
    };
    try {
      link = spotLink(link);
      const sid = link.match(/track\/([a-zA-Z0-9]{22})/);
      const sidik = sid ? sid[1] : null;
      if (!sidik) throw new Error("ID Spotify nya kagak ada!");
      const meta = `https://spowload.com/spotify/track-${sidik}`;
      const {
        data: html
      } = await client.get(meta);
      const $ = cheerio.load(html);
      const scripts = $("script");
      let urldata = null;
      const csrfToken = $('meta[name="csrf-token"]').attr("content");
      scripts.each((index, script) => {
        const sc = $(script).html();
        const jason = sc.match(/let urldata = "(.*?)";/);
        if (jason && jason[1]) {
          urldata = jason[1].replace(/\\\"/g, '"');
          return false;
        }
      });
      if (!urldata) {
        throw new Error("Kagak nemu metadata nyaa!");
      }
      const metadata = JSON.parse(urldata);
      let redirect;
      try {
        const analyze = await client.post("https://spowload.com/analyze", new URLSearchParams({
          _token: csrfToken,
          trackUrl: link
        }), {
          headers: {
            ...headers,
            "content-type": "application/x-www-form-urlencoded",
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
          },
          maxRedirects: 0,
          validateStatus: s => s >= 200 && s < 400
        });
        redirect = analyze.headers.location || analyze.request.res.responseUrl;
      } catch (e) {
        redirect = e.response?.headers?.location;
        if (!redirect) throw e;
      }
      const {
        data: convert
      } = await client.post("https://spowload.com/convert", {
        urls: link,
        cover: metadata.album.images[0].url
      }, {
        headers: {
          ...headers,
          "x-csrf-token": csrfToken
        }
      });
      console.log(convert);
      return {
        status: true,
        metadata: metadata,
        token: csrfToken,
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
};
export default async function handler(req, res) {
  if (req.method === "POST" || req.method === "GET") {
    const link = req.method === "POST" ? req.body.link : req.query.link;
    if (!link) {
      return res.status(400).json({
        status: false,
        error: "Link Spotify tidak ditemukan!"
      });
    }
    try {
      const result = await spowload.create(link);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        status: false,
        error: error.message
      });
    }
  } else {
    return res.status(405).json({
      status: false,
      error: "Method not allowed"
    });
  }
}