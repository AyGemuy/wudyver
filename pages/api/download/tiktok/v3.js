import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  FormData
} from "formdata-node";
class Tmate {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
  }
  async getToken() {
    const config = {
      method: "GET",
      url: "https://tmate.cc/id",
      headers: {
        "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8",
        "accept-language": "id-ID",
        "upgrade-insecure-requests": "1",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "alt-used": "tmate.cc",
        priority: "u=0, i",
        te: "trailers"
      }
    };
    const response = await this.client.request(config);
    const html = response.data;
    const $ = cheerio.load(html);
    return $('input[name="token"]').val();
  }
  async getData(url) {
    const token = await this.getToken();
    const data = new FormData();
    data.append("url", url);
    data.append("token", token);
    const postConfig = {
      method: "POST",
      url: "https://tmate.cc/action",
      headers: {
        "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
        "accept-language": "id-ID",
        "content-type": "multipart/form-data;",
        referer: "https://tmate.cc/id",
        origin: "https://tmate.cc",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        priority: "u=0",
        te: "trailers"
      },
      data: data
    };
    const postResponse = await this.client.request(postConfig);
    return postResponse.data;
  }
  async download(url) {
    const data = await this.getData(url);
    const result = data.data;
    const $ = cheerio.load(result);
    const title = $('h1[itemprop="name"] a').text().trim();
    const username = $("p span").text().trim();
    const downloadLinks = [];
    $(".abuttons a").each((index, element) => {
      const link = $(element).attr("href");
      if (link.startsWith("https")) {
        const linkText = $(element).text().trim();
        downloadLinks.push({
          title: linkText,
          url: link
        });
      }
    });
    return {
      title: title,
      username: username,
      media: media
    };
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL parameter is required"
    });
  }
  try {
    const tmate = new Tmate();
    const data = await tmate.download(url);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
}