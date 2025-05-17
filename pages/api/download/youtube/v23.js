import axios from "axios";
import * as cheerio from "cheerio";
class YouTubeDownloader {
  constructor() {
    this.baseUrl = "https://www.vidswatch.com/";
  }
  async fetchDownloadLinks(youtubeUrl) {
    const downloadUrl = `${this.baseUrl}download.php?s=link&url=${encodeURIComponent(youtubeUrl)}`;
    const headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=0, i",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "cross-site",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      cookie: "_gid=GA1.2.415725382.1736562901; prefetchAd_3447965=true; _ga_H2FKJS0DK3=GS1.1.1736562899.1.1.1736562950.0.0.0; _ga=GA1.1.75603664.1736562900"
    };
    const {
      data
    } = await axios.get(downloadUrl, {
      headers: headers
    });
    const $ = cheerio.load(data);
    const firstLinks = $(".sv-download-links a").map((_, el) => ({
      link: this.baseUrl + $(el).attr("href"),
      quality: $(el).text().trim()
    })).get();
    const secondResults = await Promise.all(firstLinks.map(async ({
      link,
      quality
    }) => {
      try {
        const {
          data: secondData
        } = await axios.get(link, {
          headers: headers
        });
        const $$ = cheerio.load(secondData);
        const secondLinks = $$(".sv-download-links a.start-download").map((_, el) => ({
          link: $$(el).attr("href"),
          quality: `${quality} - ${$$(el).text().trim()}`
        })).get();
        return secondLinks.length ? secondLinks : [{
          link: null,
          quality: `No further download links for quality: ${quality}`
        }];
      } catch {
        return [{
          link: null,
          quality: `Error processing quality: ${quality}`
        }];
      }
    }));
    return {
      original: firstLinks.filter(({
        link
      }) => link),
      result: secondResults.flat().filter(({
        link
      }) => link).map(({
        link,
        quality
      }) => ({
        link: link.startsWith("http") ? link : this.baseUrl + link,
        quality: quality
      }))
    };
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "Invalid YouTube URL"
    });
    const downloader = new YouTubeDownloader();
    const data = await downloader.fetchDownloadLinks(url);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}