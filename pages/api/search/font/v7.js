import axios from "axios";
import * as cheerio from "cheerio";
class FontScraper {
  constructor() {
    this.url = "https://www.1001freefonts.com";
  }
  async search({
    query,
    page
  }) {
    const searchUrl = page ? `${this.url}/search.php?q=${query}&d=0&page=${page}` : `${this.url}/search.php?q=${query}&d=0`;
    const headers = {
      accept: "text/html",
      "user-agent": "Mozilla/5.0"
    };
    try {
      const res = await axios.get(searchUrl, {
        headers: headers
      });
      return res.status === 200 ? this.parseFonts(res.data) : [];
    } catch (e) {
      console.log("fetch error:", e.message);
      return [];
    }
  }
  parseFonts(html) {
    const $ = cheerio.load(html);
    return $(".fontPreviewWrapper").map((i, el) => {
      el = $(el);
      const aTags = el.find(".fontPreviewTitle a");
      const name = aTags.eq(0).text().trim() || "No name";
      const link = aTags.eq(0).attr("href") ? this.url + aTags.eq(0).attr("href") : "No link";
      const designer = aTags.eq(1).text().trim() || "No designer";
      const desc = el.find(".previewLicenceText").text().trim() || "No description";
      const bg = el.find(".fontPreviewImageWrapper").attr("style") || "";
      const image = bg.split("url(")[1]?.split(")")[0] ? bg.split("url(")[1].split(")")[0] : "No image";
      const dl = el.find(".downloadButtonElement a").attr("href") || "";
      const download = dl.startsWith("http") ? dl : this.url + dl;
      const cats = el.find(".fontTopCategories a").map((i, em) => $(em).text().trim()).get();
      const categories = cats.length ? cats : ["No category"];
      return {
        name: name,
        link: link,
        designer: designer,
        description: desc,
        image: image,
        download: download,
        categories: categories
      };
    }).get();
  }
}
const scraper = new FontScraper();
scraper.search({
  query: "bebas",
  page: 1
}).then(res => console.log(res.length ? res : "No result"));
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query are required"
    });
  }
  try {
    const fonts = new FontScraper();
    const response = await fonts.search(params);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}