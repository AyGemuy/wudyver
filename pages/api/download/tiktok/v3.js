import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData
} from "formdata-node";
const tmate = {
  getToken: async () => {
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
        te: "trailers",
        Cookie: "session_data=e05d085a6bde39f39b0a6cb3f36cf239; _ga_P0RY16G4PC=GS1.1.1732243100.2.0.1732243100.60.0.0; _ga=GA1.1.518115277.1732232414"
      }
    };
    const response = await axios.request(config);
    const html = response.data;
    const $ = cheerio.load(html);
    return $('input[name="token"]').val();
  },
  getData: async url => {
    const token = await tmate.getToken();
    const data = new FormData();
    data.append("url", url);
    data.append("token", token);
    const postConfig = {
      method: "POST",
      url: "https://tmate.cc/action",
      headers: {
        "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
        "accept-language": "id-ID",
        "content-type": `multipart/form-data;`,
        referer: "https://tmate.cc/id",
        origin: "https://tmate.cc",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        priority: "u=0",
        te: "trailers",
        Cookie: "session_data=e05d085a6bde39f39b0a6cb3f36cf239; _ga_P0RY16G4PC=GS1.1.1732243100.2.1.1732243198.60.0.0; _ga=GA1.1.518115277.1732232414"
      },
      data: data
    };
    const postResponse = await axios.request(postConfig);
    return postResponse.data;
  },
  download: async url => {
    const data = await tmate.getData(url);
    const result = data.data;
    const $ = cheerio.load(result);
    const title = $('h1[itemprop="name"] a').text().trim();
    const username = $("p span").text().trim();
    const downloadLinks = [];
    $(".abuttons a").each((index, element) => {
      const link = $(element).attr("href");
      const linkText = $(element).text().trim();
      downloadLinks.push({
        linkText: linkText,
        link: link
      });
    });
    const results = {
      title: title,
      username: username,
      downloadLinks: downloadLinks
    };
    return results;
  }
};
export default async function handler(req, res) {
  if (req.method === "GET") {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        error: "URL parameter is required"
      });
    }
    try {
      const data = await tmate.download(url);
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}