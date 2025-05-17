import axios from "axios";
import * as cheerio from "cheerio";
class SakuraNovel {
  baseUrl;
  cf;
  base_headers;
  constructor() {
    this.baseUrl = "https://sakuranovel.id/";
    this.cf = "https://kaviaann-cloudflare.hf.space/scrape";
    this.base_headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7,ms;q=0.6",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      origin: this.baseUrl,
      referer: this.baseUrl,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async search({
    query
  }) {
    return new Promise(async (resolve, reject) => {
      try {
        const r = await axios.post(`${this.baseUrl}wp-admin/admin-ajax.php`, {
          action: "data_fetch",
          keyword: query
        }, {
          headers: this.base_headers
        }).then(v => v.data).catch(e => {
          throw e;
        });
        if (!r) throw "Result data not found";
        const $ = cheerio.load(r);
        const d = $(".searchbox").map((i, el) => {
          return {
            title: $(el).find("a").attr("title"),
            link: $(el).find("a").attr("href"),
            thumbnail: $(el).find("img").attr("src").split("?")[0],
            type: $(el).find(".type").map((i, el) => $(el).text().trim()).get(),
            status: $(el).find(".status").text()?.trim()
          };
        }).get();
        return resolve(d);
      } catch (e) {
        return reject(new Error(`Error in search function : ${e}`));
      }
    });
  }
  async info({
    url
  }) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!/sakuranovel\..*?\/.*?\/.*?\//.test(url)) throw "Url is not valid, make sure to enter valid url from sakuranovel!";
        const r = await axios.get(`${this.cf}?url=${url}`).then(v => v.data).catch(({
          response: e
        }) => {
          const err = e.data;
          throw `Fail to fetch to anticf website : ${e.status == 404 ? "Fail to connect to the website, make sure to enter a valid url!" : err.messagey}`;
        });
        const $ = cheerio.load(r);
        const el = $(".series .container .series-flex");
        const kr = $(el).find(".series-flexleft");
        const kn = $(el).find(".series-flexright");
        const d = {
          id: $(kr).find("button.bookmark").attr("data-postid"),
          title: $(kr).find(".series-titlex h2").text()?.trim(),
          thumbnail: $(kr).find("img").attr("src"),
          synops: $(kn).find(".series-synops p").map((i, el) => $(el).text().trim()).get().join("\n"),
          info: $(kr).find(".series-infoz.block span").map((i, el) => {
            return {
              category: $(el).attr("class")?.split(" ")[0],
              value: $(el).text()?.trim()
            };
          }).get().concat($(kr).find("ul.series-infolist li").map((i, el) => {
            const s = $(el).find("span");
            return {
              category: $(el).find("b").text().toLowerCase(),
              value: $(s).text(),
              anchor: !$(s).find("a").length ? null : $(el).find("a").map((i, el) => {
                return {
                  value: $(el).text(),
                  link: $(el).attr("bref")
                };
              }).get()
            };
          }).get()),
          ratings: +($(kr).find('.series-infoz.score span[itemprop="ratingValue"]').text().trim() || 0),
          favorite: +($(kr).find("button.bookmark").attr("data-favoritecount") || "0"),
          genres: $(kn).find(".series-genres a").map((i, el) => $(el).text().trim()).get(),
          chapter: $(kn).find("ul.series-chapterlists li").map((i, el) => {
            return {
              title: $(el).find("a").attr("title"),
              link: $(el).find("a").attr("href"),
              date: $(el).find("span.date").text()
            };
          }).get()
        };
        return resolve(d);
      } catch (e) {
        return reject(new Error(`Error in info function : ${e}`));
      }
    });
  }
  async read({
    url
  }) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!/sakuranovel\..*?\/.*?\//gi.test(url)) throw "Url is not valid, make sure to enter valid url from sakuranovel!";
        const r = await axios.get(`${this.cf}?url=${url}`).then(v => v.data).catch(({
          response: e
        }) => {
          const err = e.data;
          throw `Fail to fetch to anticf website : ${e.status == 404 ? "Fail to connect to the website, make sure to enter a valid url!" : err.messagey}`;
        });
        const $ = cheerio.load(r);
        const c = $("main .content");
        const d = {
          title: $(c).find("h2.title-chapter").text().trim(),
          novel: $(c).find(".content .asdasd p").slice(0, $(c).find(".content .asdasd p").length - 1).map((i, el) => $(el).text().trim()).get()
        };
        return resolve(d);
      } catch (e) {
        return reject(new Error(`Error in read function : ${e}`));
      }
    });
  }
}
export default async function handler(req, res) {
  try {
    const {
      method
    } = req;
    const sakura = new SakuraNovel();
    const {
      query,
      action,
      url
    } = method === "GET" ? req.query : req.body;
    let data;
    switch (action) {
      case "search":
        data = await sakura.search({
          query: query
        });
        break;
      case "info":
        data = await sakura.info({
          url: url
        });
        break;
      case "read":
        data = await sakura.read({
          url: url
        });
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