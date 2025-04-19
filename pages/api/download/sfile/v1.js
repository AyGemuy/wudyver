import axios from "axios";
import * as cheerio from "cheerio";
class HttpRequest {
  constructor() {
    this.cookies = "";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=0, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async download({
    url
  }) {
    try {
      let response = await axios.get(url, {
        headers: this.headers,
        withCredentials: true
      });
      this.cookies = response.headers["set-cookie"]?.map(cookie => cookie.split(";")[0]).join("; ") || "";
      this.headers["cookie"] = this.cookies;
      let $ = cheerio.load(response.data);
      let dlLink = $("a.w3-button.w3-blue.w3-round#download").attr("href");
      if (!dlLink) return null;
      let [name, type] = [$(".file-content .intro").text().trim(), $(".file-content .list").first().text().split(" - ")[1]];
      let [uploader, date, downloads] = [$(".file-content .list").eq(1).find("a").text(), $(".file-content .list").eq(2).text().replace("Uploaded: ", "").trim(), $(".file-content .list").eq(3).text().replace("Downloads: ", "").trim()];
      while (true) {
        response = await axios.get(dlLink, {
          headers: this.headers,
          withCredentials: true
        });
        this.cookies = response.headers["set-cookie"]?.map(cookie => cookie.split(";")[0]).join("; ") || "";
        this.headers["cookie"] = this.cookies;
        const finalLink = (response.data.match(/<script>(.*?)<\/script>/s)?.[1].match(/var sf = "(.*?)"/)?.[1] || "").replace(/\\/g, "");
        if (finalLink) {
          let meta = await this.getFileMetadata(finalLink);
          return {
            name: name,
            type: type,
            uploader: uploader,
            date: date,
            downloads: downloads,
            dlLink: finalLink,
            ...meta
          };
        }
        await new Promise(resolve => setTimeout(resolve, 2e3));
      }
    } catch (error) {
      return null;
    }
  }
  async getFileMetadata(link) {
    try {
      const response = await axios.head(link, {
        headers: this.headers
      });
      return {
        size: response.headers["content-length"] ? `${(response.headers["content-length"] / 1024 / 1024).toFixed(2)} MB` : "Unknown",
        mime: response.headers["content-type"] || "Unknown"
      };
    } catch (error) {
      return {
        size: "Unknown",
        mime: "Unknown"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const httpRequest = new HttpRequest();
  try {
    const data = await httpRequest.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during request"
    });
  }
}