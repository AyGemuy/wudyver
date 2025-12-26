import axios from "axios";
import * as cheerio from "cheerio";
class SainsTekno {
  constructor() {
    this.ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";
  }
  async search({
    query
  }) {
    try {
      const {
        data
      } = await axios.get(`https://www.sainstekno.web.id/search?q=${encodeURIComponent(query)}`, {
        headers: {
          "User-Agent": this.ua
        }
      });
      const $ = cheerio.load(data);
      const url = $(".post-title a").first().attr("href");
      return url ? this.det(url) : {
        status: false,
        message: "Hero not found"
      };
    } catch (e) {
      return {
        error: e.message
      };
    }
  }
  async det(url) {
    try {
      const {
        data: html
      } = await axios.get(url, {
        headers: {
          "User-Agent": this.ua
        }
      });
      const $ = cheerio.load(html);
      const body = $(".post-body-artikel");
      const title = $("h1.post-title").text().trim();
      const breadcrumbs = $('.breadcrumbs span[itemprop="name"]').map((_, el) => $(el).text().trim()).get();
      const build_variants = [];
      body.find("h3").each((_, el) => {
        const text = $(el).text();
        if (/build/i.test(text)) {
          const table = $(el).nextAll("table").first();
          const img = table.find("img").attr("src");
          const caption = table.find(".tr-caption").text().trim() || $(el).next("p, div").text().trim();
          build_variants.push({
            title: text.trim(),
            image: img,
            description: caption
          });
        }
      });
      const item_details = [];
      body.find("h4").each((_, el) => {
        const name = $(el).text().trim();
        if (/^\d+\./.test(name)) {
          const wrapper = $(el).nextAll("div, ul").first();
          const stats = wrapper.find("li").map((_, li) => $(li).text().trim()).get();
          const passive = wrapper.find("div, p").filter((_, d) => $(d).text().includes("Pasif Unik")).text().trim();
          item_details.push({
            name: name.replace(/^\d+\.\s*/, ""),
            stats: stats,
            passive: passive
          });
        }
      });
      const emblemH3 = body.find("h3").filter((_, el) => /emblem/i.test($(el).text()));
      const emblem = {
        title: emblemH3.text().trim(),
        tiers: emblemH3.nextAll("ul").first().find("li").map((_, li) => $(li).text().trim()).get()
      };
      const spellH3 = body.find("h3").filter((_, el) => /spell/i.test($(el).text()));
      let spellContent = "";
      const spellNext = spellH3.nextAll("ul, div, p").first();
      if (spellNext.is("ul")) {
        spellContent = spellNext.find("li").map((_, li) => $(li).text().trim()).get().join("\n");
      } else {
        spellContent = spellNext.text().trim();
      }
      const skills = [];
      body.find("h4").each((_, el) => {
        const sName = $(el).text().trim();
        if (/pasif|skill|ultimate/i.test(sName)) {
          let sDesc = "";
          let next = $(el).next();
          while (next.length && !/h4|h3/i.test(next[0].tagName)) {
            const txt = next.text().trim();
            if (txt) sDesc += txt + "\n";
            next = next.next();
          }
          skills.push({
            name: sName,
            description: sDesc.trim()
          });
        }
      });
      const author = {
        name: $(".author-name").text().trim(),
        bio: $(".author-bio").text().trim(),
        avatar: $(".author-image").attr("data-src") || $(".author-image").attr("src")
      };
      return {
        status: true,
        title: title,
        breadcrumbs: breadcrumbs,
        intro: body.find("p").first().text().trim(),
        build_variants: build_variants,
        items: item_details[0],
        emblem: emblem,
        battle_spell: spellContent,
        skills: skills,
        author: author
      };
    } catch (e) {
      return {
        status: false,
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new SainsTekno();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}