import axios from "axios";
import * as cheerio from "cheerio";
class SfileDl {
  constructor() {
    this.cookies = "";
    this.axiosInstance = axios.create({
      headers: {
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
      },
      withCredentials: true
    });
    this.axiosInstance.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        this.cookies = setCookieHeader.map(cookie => cookie.split(";")[0]).join("; ");
        this.axiosInstance.defaults.headers.common["cookie"] = this.cookies;
      }
      return response;
    }, error => {
      console.error("Axios Interceptor Error:", error);
      return Promise.reject(error);
    });
  }
  async download({
    url,
    output = "url"
  }) {
    try {
      let response = await this.axiosInstance.get(url);
      let $ = cheerio.load(response.data);
      let dlLink = $("a.w3-button.w3-blue.w3-round#download").attr("href");
      if (!dlLink) {
        console.log("No download link found for URL:", url);
        return null;
      }
      let [name, type] = [$(".file-content .intro").text().trim(), $(".file-content .list").first().text().split(" - ")[1]];
      let [uploader, date, downloads] = [$(".file-content .list").eq(1).find("a").text(), $(".file-content .list").eq(2).text().replace("Uploaded: ", "").trim(), $(".file-content .list").eq(3).text().replace("Downloads: ", "").trim()];
      while (true) {
        try {
          response = await this.axiosInstance.get(dlLink);
          const finalLink = (response.data.match(/<script>(.*?)<\/script>/s)?.[1].match(/var sf = "(.*?)"/)?.[1] || "").replace(/\\/g, "");
          if (finalLink) {
            let meta = await this.getFileMetadata(finalLink);
            let dlLinkBase64 = null;
            if (output === "base64") {
              try {
                const contentResponse = await this.axiosInstance.get(finalLink, {
                  responseType: "arraybuffer"
                });
                dlLinkBase64 = Buffer.from(contentResponse.data).toString("base64");
              } catch (contentError) {
                console.error("Error fetching or encoding content to Base64 from finalLink:", finalLink, contentError);
              }
            }
            return {
              name: name,
              type: type,
              uploader: uploader,
              date: date,
              downloads: downloads,
              dlLink: finalLink,
              dlLinkBase64: dlLinkBase64,
              ...meta
            };
          }
          console.log("No final link found after retry, retrying in 2 seconds...");
          await new Promise(resolve => setTimeout(resolve, 2e3));
        } catch (innerError) {
          console.error("Error during inner download loop for dlLink:", dlLink, innerError);
          await new Promise(resolve => setTimeout(resolve, 2e3));
        }
      }
    } catch (error) {
      console.error("Error during initial download or cheerio parsing for URL:", url, error);
      return null;
    }
  }
  async getFileMetadata(link) {
    try {
      const response = await this.axiosInstance.head(link);
      return {
        size: response.headers["content-length"] ? `${(response.headers["content-length"] / 1024 / 1024).toFixed(2)} MB` : "Unknown",
        mime: response.headers["content-type"] || "Unknown"
      };
    } catch (error) {
      console.error("Error getting file metadata for link:", link, error);
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
  const sfile = new SfileDl();
  try {
    const data = await sfile.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during request"
    });
  }
}