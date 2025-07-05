import axios from "axios";
class LikeeDownloader {
  constructor() {
    this.url = "https://likeedownloader.com/process";
  }
  decode(base64Url) {
    return Buffer.from(base64Url, "base64").toString("utf-8");
  }
  getSegments(url) {
    return url.split("/").slice(-2).join("/");
  }
  async getLinks(id, locale = "id") {
    try {
      const {
        data
      } = await axios.post(this.url, `id=${encodeURIComponent(id)}&locale=${locale}`, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "Mozilla/5.0",
          Referer: "https://likeedownloader.com/id"
        }
      });
      const $ = cheerio.load(data.template);
      const [views, likes, comments] = $("p.infotext").text().split(",").map(text => text.trim());
      const imageUrl = $("div.img_thumb img").attr("src") || "";
      const decodedImageUrl = this.decode(this.getSegments(imageUrl));
      return {
        views: views || "No views",
        likes: likes || "No likes",
        comments: comments || "No comments",
        image: decodedImageUrl,
        download: $("div.result-links-item").map((_, el) => {
          const encodedLink = $(el).find("a.download_link").attr("href") || "";
          const decodedLink = this.decode(this.getSegments(encodedLink));
          return {
            type: $(el).find("div").eq(0).text().trim() || "Unknown",
            link: decodedLink || ""
          };
        }).get()
      };
    } catch (error) {
      console.error("Error:", error);
      return {};
    }
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
    const downloader = new LikeeDownloader();
    const result = await downloader.getLinks(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      status: false,
      error: "Failed to process the URL"
    });
  }
}