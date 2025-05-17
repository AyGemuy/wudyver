import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class SoundCloudDownloader {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded",
      "hx-current-url": "",
      "hx-request": "true",
      "hx-target": "loader_result",
      origin: "https://snapsoundcloud.com",
      priority: "u=1, i",
      referer: "https://snapsoundcloud.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async downloadTrack(url) {
    this.headers["hx-current-url"] = `https://snapsoundcloud.com/soundcloud?url=${url}`;
    try {
      const {
        data
      } = await this.client.post("https://api.menarailpost.com/soundcloud/download", new URLSearchParams({
        url: url
      }), {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const downloads = [];
      $("ul.my-4 li").each((_, element) => {
        const format = $(element).find("span").first().text().trim();
        const link = $(element).find("a").attr("href") || $(element).find("button").attr("hx-get") || "";
        if (link && link.startsWith("https")) {
          downloads.push({
            format: format,
            link: link
          });
        }
      });
      const downloadLinks = await Promise.allSettled(downloads.map(async ({
        format,
        link
      }) => {
        try {
          console.log(`Processing ${format} from ${link}...`);
          const response = await this.client.get(link);
          if (response.data) {
            const $$ = cheerio.load(response.data);
            const downloadUrl = $$('a[href*="download/file"]').attr("href");
            if (downloadUrl) {
              console.log(`Download link found: ${downloadUrl}`);
              return {
                url: downloadUrl,
                format: format
              };
            }
          }
        } catch (error) {
          console.error(`Failed to process ${format} from ${link}: ${error.message}`);
        }
      }));
      return {
        image: $("img").attr("src") || "",
        title: $("h2").text().trim() || "No title",
        artist: $("span").first().text().trim() || "Unknown Artist",
        duration: $('span:contains("Duration")').text().replace("Duration: ", "").trim() || "N/A",
        downloadLinks: downloadLinks.filter(result => result.status === "fulfilled" && result.value).map(result => result.value)
      };
    } catch (error) {
      console.error("Error during download process:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new SoundCloudDownloader();
    const result = await downloader.downloadTrack(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}