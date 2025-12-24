import axios from "axios";
import https from "https";
import * as cheerio from "cheerio";
import {
  FormData
} from "formdata-node";
class Samehadaku {
  constructor() {
    this.BASE_URL = "https://samehadaku.mba";
    this.client = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: true
      }),
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
      }
    });
  }
  async search(query) {
    try {
      const res = await this.client.get(`${this.BASE_URL}/?${new URLSearchParams({
s: encodeURIComponent(query)
})}`);
      const $ = cheerio.load(res.data);
      if ($("main#main").find(".notfound").length) throw new Error("Query Not Found");
      const data = [];
      $("main#main").find("article.animpost").each((i, el) => {
        data.push({
          title: $(el).find("img").attr("title")?.trim(),
          id: $(el).attr("id")?.split("-")[1] || "",
          thumbnail: $(el).find("img").attr("src") || "",
          description: $(el).find("div.ttls").text().trim(),
          genre: $(el).find("div.genres > .mta > a").map((i, el) => $(el).text().trim()).get(),
          type: $(el).find("div.type").map((i, el) => $(el).text().trim()).get(),
          star: $(el).find("div.score").text().trim(),
          views: $(el).find("div.metadata > span").eq(2).text().trim(),
          link: $(el).find("a").attr("href") || ""
        });
      });
      return data;
    } catch (err) {
      console.log("[Samehadaku.search] Error:", err.message);
      throw err;
    }
  }
  async latest() {
    try {
      const res = await this.client.get(`${this.BASE_URL}/anime-terbaru/`);
      const $ = cheerio.load(res.data);
      const ul = $("div.post-show > ul").children("li");
      const data = {
        total: 0,
        anime: []
      };
      ul.each((i, el) => {
        data.anime.push({
          title: $(el).find("h2.entry-title").text().trim().split(" Episode")[0],
          thumbnail: $(el).find("div.thumb > a > img").attr("src") || "",
          postedBy: $(el).find('span[itemprop="author"] > author').text().trim(),
          episode: $(el).find("span").eq(0).find("author").text().trim(),
          release: $(el).find('span[itemprop="author"]').next().contents().eq(3).text().split(": ")[1]?.trim(),
          link: $(el).find("a").attr("href") || ""
        });
      });
      data.total = data.anime.length;
      return data;
    } catch (err) {
      console.log("[Samehadaku.latest] Error:", err.message);
      throw err;
    }
  }
  async release() {
    try {
      const data = {
        sunday: [],
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: []
      };
      for (let day of Object.keys(data)) {
        const res = await this.client.get(`${this.BASE_URL}/wp-json/custom/v1/all-schedule?${new URLSearchParams({
perpage: "20",
day: day,
type: "schtml"
})}`);
        data[day] = res.data;
      }
      return data;
    } catch (err) {
      console.log("[Samehadaku.release] Error:", err.message);
      throw err;
    }
  }
  async detail(url) {
    try {
      if (!url.match(/samehadaku\.\w+\/anime/gi)) throw new Error("Invalid URL");
      const res = await this.client.get(url);
      const $ = cheerio.load(res.data);
      return {
        title: $('.infoanime > h1[itemprop="name"]').text().trim().replace("Nonton Anime ", ""),
        thumbnail: $(".infoanime > .thumb > img").attr("src") || "",
        published: new Date($(".anim-senct").find("time").attr("datetime") || ""),
        trailer: $(".trailer-anime").find("iframe").attr("src") || "",
        rating: $(".infoanime").find('span[itemprop="ratingValue"]').text().trim() + "/" + $(".infoanime").find('i.hidden[itemprop="ratingCount"]').attr("content"),
        description: $(".infox > .desc").text().trim(),
        genre: $(".infox > .genre-info > a").map((i, e) => $(e).text().trim()).get(),
        detail: $("h3.anim-detail").next().find("span").map((i, el) => ({
          name: $(el).find("b").text().trim(),
          data: `${$(el).text().trim()}`.replace($(el).find("b").text().trim() + " ", "").trim()
        })).get(),
        batch: $(".listbatch").find("a").attr("href") || null,
        episode: $(".lstepsiode > ul > li").map((i, el) => ({
          title: $(el).find(".lchx > a").text().trim(),
          date: $(el).find(".date").text().trim(),
          link: $(el).find(".eps > a").attr("href") || ""
        })).get()
      };
    } catch (err) {
      console.log("[Samehadaku.detail] Error:", err.message);
      throw err;
    }
  }
  async download(url) {
    try {
      if (!/samehadaku\.\w+\/[\w-]+episode/gi.test(url)) throw new Error("Invalid URL!");
      const res = await this.client.get(url);
      const $ = cheerio.load(res.data);
      const data = {
        title: $('h1[itemprop="name"]').text().trim(),
        link: url,
        downloads: []
      };
      const items = $("div#server > ul > li").get();
      for (let el of items) {
        const downloadData = {
          name: $(el).find("span").text().trim(),
          post: $(el).find("div").attr("data-post") || "",
          nume: $(el).find("div").attr("data-nume") || "",
          type: $(el).find("div").attr("data-type") || "",
          link: ""
        };
        const formData = new FormData();
        formData.set("action", "player_ajax");
        formData.set("post", downloadData.post);
        formData.set("nume", downloadData.nume);
        formData.set("type", downloadData.type);
        const iframeHtml = await this.client.post("https://samehadaku.mba/wp-admin/admin-ajax.php", formData, {
          headers: {
            ...formData.headers,
            origin: "https://samehadaku.mba"
          }
        });
        const $$ = cheerio.load(iframeHtml.data);
        downloadData.link = $$("iframe").attr("src") || "";
        data.downloads.push(downloadData);
      }
      return data;
    } catch (err) {
      console.log("[Samehadaku.download] Error:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      method
    } = req;
    const samehadaku = new Samehadaku();
    const {
      query,
      action,
      url
    } = method === "GET" ? req.query : req.body;
    let data;
    switch (action) {
      case "search":
        data = await samehadaku.search(query);
        break;
      case "latest":
        data = await samehadaku.latest();
        break;
      case "release":
        data = await samehadaku.release();
        break;
      case "detail":
        data = await samehadaku.detail(url);
        break;
      case "download":
        data = await samehadaku.download(url);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action parameter"
        });
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}