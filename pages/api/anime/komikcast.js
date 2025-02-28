import axios from "axios";
import * as cheerio from "cheerio";
class Komikcast {
  base_url;
  base_header;
  constructor(url) {
    this.base_url = url || "https://komikcast.bz/";
    this.base_header = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7,ms;q=0.6",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Priority: "u=0, i",
      cookie: "HstCfa3653987=1735642482517; HstCla3653987=1735642482517; HstCmu3653987=1735642482517; HstPn3653987=1; HstPt3653987=1; HstCnv3653987=1; HstCns3653987=1; c_ref_3653987=https%3A%2F%2Fwww.google.com%2F; _gid=GA1.2.1836128189.1735642483; _ga_86TH8K4Q71=GS1.1.1735642483.1.0.1735642483.0.0.0; _ga=GA1.1.1281328506.1735642483; cf_clearance=kf8O0bOz3UADR5RVRkIdGcLqDrY1zvLFU6NB.nta5l0-1735642484-1.2.1.1-H0W_ILLa3AO.OXeYnhTGbBJlVf6ESF_GLogSS29HxQ_RRnqNmO4fAPb36yzIyOliEGY1KIL0g8PDnEexgiv6VWm.sL6OCESeV82LR.KLBJx0xZyBl5bC5_XjMN7AJyBUy5ET9LgNo9BATDG3ZhMbYmJA3_S2NV_IH0ldJiA5mX5akyrrHO9DeCxgmGOWHxlBWWn5uqPJVNoKgdczbltRrg55VDiAKnuSfYRsCqubTv8nhQmfPLiEyRIkYmVG.8j4mlIxg53j8J0Fjpc5BUjIS68m_pXHCt0fkLmXN.1Omd7Wa63ddD3ms9SNW1ai.x4Ad5RyN3eAkxh5KqZAj04rCUR_Bd__1f0GPi5wsaNBYGtkX82SYgkoKJ1eAbbs9PdmK80FJlNfqf6cerHRKLCsSA; __dtsu=6D001735642483319E23A5A42451BFF2",
      Referer: "https://www.google.com/",
      "Sec-CH-UA": '"Safari";v="17", "Chromium";v="117", "Not-A.Brand";v="24"',
      "Sec-CH-UA-Mobile": "?0",
      "Sec-CH-UA-Platform": '"IOS"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "cross-site",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_7_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1"
    };
  }
  async getHotUpdate() {
    return new Promise(async (resolve, reject) => {
      try {
        const r = await axios.get(this.base_url, {
          headers: this.base_header
        }).then(v => v.data).catch(e => {
          throw new Error("Failed to fetch website data" + e.status);
        });
        const $ = cheerio.load(r);
        const d = $("div.listupd.komikinfo").find(".swiper-wrapper").children("div.splide-slide").map((i, el) => {
          return {
            title: $(el).find("a[href]").attr("title"),
            link: $(el).find("a[href]").attr("href"),
            type: $(el).find("span.type").map((i, el) => $(el).text().trim()).get(),
            thumbnail: $(el).find("img").attr("src"),
            chapter: {
              number: $(el).find("div.chapter").text().trim(),
              link: $(el).find("div.chapter").attr("href")
            },
            rating: +$(el).find("div.numscore").text().replace(",", ".").trim(),
            star: Math.round(+$(el).find("div.numscore").text().replace(",", ".").trim() / 2)
          };
        }).get();
        return resolve(d);
      } catch (e) {
        return reject(`Error in getHotUpdate : ${e}`);
      }
    });
  }
  async getProjectList(page) {
    return new Promise(async (resolve, reject) => {
      try {
        const d = await this.getKomikFunc(`${this.base_url}project-list`, {
          page: page || 0
        });
        return resolve(d);
      } catch (e) {
        return reject(`Error in getProjectList : ${e}`);
      }
    });
  }
  async getKomik(data) {
    return new Promise(async (resolve, reject) => {
      try {
        const d = await this.getKomikFunc(`${this.base_url}daftar-komik`, {
          ...data
        });
        return resolve(d);
      } catch (e) {
        return reject(`Error in getKomik : ${e}`);
      }
    });
  }
  async getSearch(query) {
    return new Promise(async (resolve, reject) => {
      try {
        const d = await this.getKomikFunc(`${this.base_url}?s=${encodeURI(query)}`);
        return resolve(d);
      } catch (e) {
        return reject(`Error in getSearch : ${e}`);
      }
    });
  }
  async getDetails(url) {
    return new Promise(async (resolve, reject) => {
      try {
        const r = await axios.get(url, {
          headers: this.base_header
        }).then(v => v.data).catch(e => {
          throw new Error(`Failed to get website data : ${e.status}`);
        });
        const $ = cheerio.load(r);
        const c = $("div.komik_info");
        const [c1, c2, c3] = $(c).children("div.komik_info-body");
        const d = {
          title: $(c1).find("h1.komik_info-content-body-title").text().trim(),
          id: $(c).attr("data-komikid"),
          thumbnail: $(c1).find("img").attr("src"),
          nativeTitle: $(c1).find("span.komik_info-content-native").text().trim().split(", ").map(v => v.trim()),
          genre: $(c1).find("span.komik_info-content-genre").children("a").map((i, el) => {
            return {
              tag: $(el).text().trim().toLowerCase(),
              link: $(el).attr("href")
            };
          }).get(),
          released: $(c1).find("span.komik_info-content-info-release").text().replace("\n", " ").trim(),
          info: $(c1).find("span.komik_info-content-info").map((i, el) => $(el).text().replace("\n", " ").trim()).get(),
          updated: {
            formated: $(c1).find("span.komik_info-content-update > time").text().trim(),
            date: $(c1).find("span.komik_info-content-update > time").attr("datetime")
          },
          synopsys: $(c1).find("div.komik_info-description-sinopsis > p").text().trim(),
          chapter: $(c2).find("ul#chapter-wrapper").children("li.komik_info-chapters-item").map((i, el) => {
            return {
              index: $(el).find("a").text().replace("\n", " ").trim(),
              link: $(el).find("a").attr("href"),
              time: $(el).find("div.chapter-link-time").text().trim()
            };
          }).get()
        };
        if (!d?.title) throw new Error("Failed to get komik details!");
        return resolve(d);
      } catch (e) {
        return reject(`Error in getDetails : ${e}`);
      }
    });
  }
  async getChapter(url) {
    return new Promise(async (resolve, reject) => {
      try {
        const r = await axios.get(url, {
          headers: this.base_header
        }).then(v => v.data).catch(e => {
          throw new Error(`Failed to get website data ${e.status}`);
        });
        const $ = cheerio.load(r);
        const ch = $("div.chapter_");
        const d = {
          title: $(ch).find('h1[itemprop="name"]').text().trim(),
          id: $(ch).find("meta").attr("content"),
          image: $(ch).find("div.main-reading-area").children("img").map((i, el) => $(el).attr("src")).get()
        };
        if (!d.title) throw new Error("Failed to get chapter!");
        return resolve(d);
      } catch (e) {
        return reject(`Error in getChapter : ${e}`);
      }
    });
  }
  async getKomikFunc(link, config) {
    return new Promise(async (resolve, reject) => {
      try {
        link = `${link}${config?.page ? `/page/${config.page}` : ""}${config ? "?" + [ "" ].concat(config?.genre || []).map(v => encodeURI(`data[]=${v}`)).join("&") + "&" + new URLSearchParams({
status: config?.status || "",
type: config?.type || "",
orderby: config?.type || "popular"
}).toString() : ""}`;
        console.log(link);
        const r = await axios.get(link, {
          headers: this.base_header
        }).then(v => v.data).catch(e => {
          throw new Error("Failed to fetch website data " + e.status);
        });
        const $ = cheerio.load(r);
        if (!$("div.list-update_items-wrapper").children("div").length) throw new Error("No items is available");
        const d = $("div.list-update_items-wrapper").children("div.list-update_item").map((i, el) => {
          return {
            title: $(el).find("h3").text().trim(),
            link: $(el).find("a").attr("href"),
            thumbnail: $(el).find("img").attr("src"),
            type: $(el).find("span.type").map((i, el) => $(el).text().trim()).get(),
            chapter: {
              number: $(el).find("div.chapter").text().trim(),
              link: $(el).find("div.chapter").attr("href")
            },
            rating: +$(el).find("div.numscore").text().replace(",", ".").trim(),
            star: Math.round(+$(el).find("div.numscore").text().replace(",", ".").trim() / 2)
          };
        }).get();
        return resolve(d);
      } catch (e) {
        return reject(`Error in getKomikFunc : ${e}`);
      }
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    page,
    url
  } = req.method === "GET" ? req.query : req.body;
  const komikcast = new Komikcast();
  try {
    switch (action) {
      case "getHotUpdate":
        const hotUpdate = await komikcast.getHotUpdate();
        return res.status(200).json(hotUpdate);
      case "getProjectList":
        const projectList = await komikcast.getProjectList(page);
        return res.status(200).json(projectList);
      case "getKomik":
        const komikList = await komikcast.getKomik({
          page: page
        });
        return res.status(200).json(komikList);
      case "getSearch":
        if (!query) throw new Error("Query is required for search!");
        const searchResult = await komikcast.getSearch(query);
        return res.status(200).json(searchResult);
      case "getDetails":
        if (!url) throw new Error("URL is required for details!");
        const details = await komikcast.getDetails(url);
        return res.status(200).json(details);
      case "getChapter":
        if (!url) throw new Error("URL is required for chapter!");
        const chapter = await komikcast.getChapter(url);
        return res.status(200).json(chapter);
      default:
        return res.status(400).json({
          error: "Invalid action!"
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}