import * as cheerio from "cheerio";
import fetch from "node-fetch";
import {
  FormData
} from "formdata-node";
class Samehadaku {
  constructor() {
    this.BASE_URL = "https://samehadaku.email";
  }
  async search(query) {
    try {
      const res = await fetch(`${this.BASE_URL}/?${new URLSearchParams({
s: query
})}`);
      if (!res.ok) throw new Error("Fail Fetching");
      const html = await res.text();
      const $ = cheerio.load(html);
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
    } catch (e) {
      throw e;
    }
  }
  async latest() {
    try {
      const url = `${this.BASE_URL}/anime-terbaru/`;
      const res = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
        }
      });
      if (!res.ok) throw new Error("Website Down");
      const html = await res.text();
      const $ = cheerio.load(html);
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
          release: $(el).find('span[itemprop="author"]').next().contents().eq(3).text().split(": ")[1].trim(),
          link: $(el).find("a").attr("href") || ""
        });
      });
      data.total = data.anime.length;
      return data;
    } catch (e) {
      throw e;
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
        const res = await fetch(`${this.BASE_URL}/wp-json/custom/v1/all-schedule?${new URLSearchParams({
perpage: "20",
day: day,
type: "schtml"
})}`);
        data[day] = await res.json();
      }
      return data;
    } catch (e) {
      throw e;
    }
  }
  async detail(url) {
    try {
      if (!url.match(/samehadaku\.\w+\/anime/gi)) throw new Error("Invalid URL");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fail Fetching");
      const html = await res.text();
      const $ = cheerio.load(html);
      const data = {
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
      return data;
    } catch (e) {
      throw e;
    }
  }
  async download(url) {
    try {
      if (!/samehadaku\.\w+\/[\w-]+episode/gi.test(url)) throw new Error("Invalid URL!");
      const res = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
        }
      });
      if (!res.ok) throw new Error("Error Fetching");
      const html = await res.text();
      const $ = cheerio.load(html);
      const data = {
        title: $('h1[itemprop="name"]').text().trim(),
        link: url,
        downloads: []
      };
      data.downloads = await Promise.all($("div#server > ul > li").map(async (i, el) => {
        const downloadData = {
          name: $(el).find("span").text().trim(),
          post: $(el).find("div").attr("data-post") || "",
          nume: $(el).find("div").attr("data-nume") || "",
          type: $(el).find("div").attr("data-type") || "",
          link: ""
        };
        const formData = new FormData();
        formData.append("action", "player_ajax");
        formData.append("post", downloadData.post);
        formData.append("nume", downloadData.nume);
        formData.append("type", downloadData.type);
        const iframeHtml = await fetch("https://samehadaku.email/wp-admin/admin-ajax.php", {
          method: "POST",
          headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            origin: "https://samehadaku.email"
          },
          body: formData
        }).then(res => res.text());
        downloadData.link = cheerio.load(iframeHtml)("iframe").attr("src") || "";
        return downloadData;
      }).get());
      return data;
    } catch (e) {
      throw e;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      method
    } = req;
    const samehadaku = new Samehadaku();
    if (method === "GET") {
      const {
        query,
        action,
        url
      } = req.method === "GET" ? req.query : req.body;
      if (action === "search") {
        const data = await samehadaku.search(query);
        return res.status(200).json(data);
      }
      if (action === "latest") {
        const data = await samehadaku.latest();
        return res.status(200).json(data);
      }
      if (action === "release") {
        const data = await samehadaku.release();
        return res.status(200).json(data);
      }
      if (action === "detail") {
        const data = await samehadaku.detail(url);
        return res.status(200).json(data);
      }
      if (action === "download") {
        const data = await samehadaku.download(url);
        return res.status(200).json(data);
      }
      return res.status(400).json({
        error: "Invalid action parameter"
      });
    }
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}