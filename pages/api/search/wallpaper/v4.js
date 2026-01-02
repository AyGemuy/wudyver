import * as cheerio from "cheerio";
import fetch from "node-fetch";
import axios from "axios";
import {
  Parser
} from "xml2js";
import util from "util";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class DeviantArt {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar()
    }));
  }
  async search(input) {
    const urlToFetch = `https://backend.deviantart.com/rss.xml?q=${input}&type=deviation`;
    try {
      const xmlData = (await axios.get(urlToFetch)).data;
      const jsonData = await this.xmlToJson(xmlData);
      return jsonData?.rss?.channel?.item;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async info(url) {
    const modifiedURL = url.includes("https://backend.deviantart.com/oembed?url=") ? url : `https://backend.deviantart.com/oembed?url=${url}&format=json`;
    try {
      const response = await fetch(modifiedURL);
      return await response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async download(url) {
    try {
      return await this.dl(url);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async dl(url) {
    try {
      const response = await this.client.get(url, {
        headers: {
          "User-Agent": "Postify/1.0.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9"
        }
      });
      const html = response.data;
      const $ = cheerio.load(html);
      const up = url.split("-");
      const deviationId = up[up.length - 1];
      const username = (url.match(/\/\/www\.deviantart\.com\/([^\/]+)/) || [])[1];
      if (!deviationId || !username) throw new Error("Unable to extract Deviation ID or Username.");
      const ct = this.extractCsrfToken($);
      if (!ct) throw new Error("Unable to extract CSRF token.");
      const request = await this.client.post("https://www.deviantart.com/_puppy/dadeviation/init", null, {
        params: {
          deviationid: deviationId,
          username: username,
          type: "art",
          include_session: false,
          csrf_token: ct,
          expand: "deviation.related",
          da_minor_version: "20230710"
        },
        headers: {
          Referer: url,
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          Origin: "https://www.deviantart.com",
          "User-Agent": "Postify/1.0.0"
        }
      });
      return request.data;
    } catch (error) {
      console.error(error.response ? error.response.data : error.message);
      throw error;
    }
  }
  extractCsrfToken($) {
    const cs = $("script").filter(function() {
      return $(this).html().includes("window.__CSRF_TOKEN__");
    }).first().html();
    if (cs) {
      const csm = cs.match(/window\.__CSRF_TOKEN__\s*=\s*["']([^"']+)["']/);
      return csm ? csm[1] : undefined;
    }
    return undefined;
  }
  async xmlToJson(xml) {
    const parseXml = util.promisify(new Parser({
      explicitArray: false,
      mergeAttrs: true
    }).parseString);
    return await parseXml(xml);
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    action,
    url,
    query
  } = req.method === "GET" ? req.query : req.body;
  const deviantArt = new DeviantArt();
  if (method === "GET") {
    try {
      switch (action) {
        case "search":
          if (!query) return res.status(400).json({
            error: "Search query is required"
          });
          const searchResults = await deviantArt.search(query);
          return res.status(200).json(searchResults);
        case "info":
          if (!url) return res.status(400).json({
            error: "URL is required for info"
          });
          const info = await deviantArt.info(url);
          return res.status(200).json(info);
        case "download":
          if (!url) return res.status(400).json({
            error: "URL is required for download"
          });
          const downloadData = await deviantArt.download(url);
          res.setHeader("Content-Type", "application/octet-stream");
          return res.status(200).send(downloadData);
        default:
          return res.status(400).json({
            error: "Invalid action"
          });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "An error occurred"
      });
    }
  } else {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}