import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", PROXY.url);
class Modyolo {
  constructor() {
    this.baseUrl = `${proxy}https://modyolo.com`;
    this.ajaxUrl = `${this.baseUrl}/wp-admin/admin-ajax.php`;
    this.ua = ["Googlebot/2.1 (+http://www.google.com/bot.html)", "Googlebot-News (+http://www.google.com/bot.html)", "Googlebot-Image/1.0", "Googlebot-Video/1.0", "Googlebot-Mobile/2.1 (+http://www.google.com/bot.html)"];
  }
  getHead(referer = this.baseUrl) {
    return {
      "User-Agent": this.ua[Math.floor(Math.random() * this.ua.length)],
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Origin: this.baseUrl,
      Referer: referer,
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    };
  }
  clean(t) {
    return t ? t.replace(/\s+/g, " ").replace(/\t|\n/g, "").trim() : "";
  }
  async getDown(subUrl) {
    try {
      const {
        data
      } = await axios.post(this.ajaxUrl, "action=k_get_download", {
        headers: this.getHead(subUrl)
      });
      const $ = cheerio.load(data);
      let direct = $("a.download").attr("href") || $("#click-here").attr("href");
      if (!direct) {
        const {
          data: rawHtml
        } = await axios.get(subUrl, {
          headers: this.getHead()
        });
        const match = rawHtml.match(/https?:\/\/files\.modyolo\.com\/[^\s'"]+/g);
        return match ? match[0] : subUrl;
      }
      return direct;
    } catch (e) {
      return subUrl;
    }
  }
  async search({
    query,
    limit = 1,
    page = 1,
    ...rest
  }) {
    try {
      const p = parseInt(page) > 1 ? `/page/${page}` : "";
      const searchUrl = `${this.baseUrl}${p}/?s=${encodeURIComponent(query)}`;
      console.log(`[GET] ${searchUrl}`);
      const {
        data
      } = await axios.get(searchUrl, {
        headers: this.getHead()
      });
      const $ = cheerio.load(data);
      const results = [];
      const apps = $(".archive-post");
      console.log(`[LIST] Query: ${query}, Page: ${page}, Found: ${apps.length} apps`);
      apps.slice(0, limit).each((i, el) => {
        const item = $(el);
        const info = item.find(".small.text-muted").first().find("span.align-middle");
        results.push({
          title: this.clean(item.find("h3").text()),
          url: item.attr("href"),
          img: item.find("img").attr("src"),
          version: this.clean(info.eq(0).text()),
          size: this.clean(info.last().text())
        });
      });
      const finalData = [];
      for (const app of results) {
        console.log(`[SEARCH] Processing: ${app.title}`);
        const details = await this.getDetails(app.url);
        finalData.push({
          ...app,
          ...details
        });
      }
      return finalData;
    } catch (error) {
      console.error("[ERROR SEARCH]", error.message);
      return [];
    }
  }
  async getDetails(url) {
    try {
      const {
        data: html
      } = await axios.get(url, {
        headers: this.getHead()
      });
      const $ = cheerio.load(html);
      const postId = $('input[name="post_id"]').val() || $("body").attr("class")?.match(/postid-(\d+)/)?.[1];
      const details = {
        postId: postId,
        fullTitle: this.clean($("h1.lead").text()),
        banner: $(".entry-content img").first().attr("src"),
        lastUpdate: this.clean($("time.text-muted").text()),
        publisher: this.clean($('th:contains("Publisher")').next().text()),
        genre: this.clean($('th:contains("Genre")').next().text()),
        rating: $(".rating").attr("data-rateyo-rating") || "0",
        votes: this.clean($(".rating").next().text()),
        description: this.clean($(".entry-content p").first().text()),
        files: []
      };
      const dlUrl = $('a[href*="/download/"]').first().attr("href");
      if (dlUrl) {
        const {
          data: dlHtml
        } = await axios.get(dlUrl, {
          headers: this.getHead(url)
        });
        const $dl = cheerio.load(dlHtml);
        const unique = new Set();
        $dl(".border.rounded.mb-3, .border.rounded.mb-2").each((i, block) => {
          const headerLabel = this.clean($(block).find(".h6").first().text());
          if (!headerLabel || /recommended|more from|like|faq/i.test(headerLabel)) return;
          $(block).find("a").each((j, link) => {
            const href = $(link).attr("href");
            if (!href || !href.includes("/download/") || unique.has(href)) return;
            unique.add(href);
            const type = this.clean($(link).find(".text-uppercase").text()) || "APK";
            const size = this.clean($(link).find(".ml-auto").text()) || this.clean($(link).text().match(/\(([^)]+)\)/)?.[1]);
            details.files.push({
              versionLabel: headerLabel,
              type: type,
              size: size,
              isMod: /mod/i.test(headerLabel) || !/original/i.test(headerLabel),
              url: href
            });
          });
        });
        for (let file of details.files) {
          file.url = await this.getDown(file.url);
        }
      }
      return details;
    } catch (error) {
      return {
        files: []
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
  const api = new Modyolo();
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