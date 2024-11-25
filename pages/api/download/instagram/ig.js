import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function inDownloader(postUrl) {
  const url = "https://indownloader.app/request";
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Accept: "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
    Referer: "https://indownloader.app/video-downloader",
  };
  const data = new URLSearchParams({
    link: postUrl,
    downloader: "video",
  });
  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: data,
  });
  const { html } = await response.json();
  const $ = cheerio.load(html);
  return $(".download-options a")
    .map((i, el) => $(el).attr("href"))
    .get()
    .filter((link) => link.includes("ey"))
    .map((v, i) => {
      try {
        return {
          url: JSON.parse(atob(v.split("id=")[1].split("&")[0]))?.url,
          title: i,
        };
      } catch (error) {
        console.error("Error decoding base64:", error);
        return {
          url: v,
          title: i,
        };
      }
    })
    .filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.url === item.url),
    );
}
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) return res.status(400).json({ message: "No url provided" });

  const result = await inDownloader(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}
