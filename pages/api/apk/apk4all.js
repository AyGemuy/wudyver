import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = ["https://thingproxy.freeboard.io/fetch/", "https://cors.newfrontdoor.org/api/cors?url=", "https://api.allorigins.win/raw?url="];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
async function searchApk4all(query) {
  const url = `https://apk4all.io/search/${query}`;
  try {
    const response = await fetch(randomProxyUrl + url);
    const data = await response.text();
    const $ = cheerio.load(data);
    const articles = [];
    $("article").each((index, element) => {
      const $article = $(element);
      const title = $article.find(".entry-title a").text().trim();
      const titleUrl = $article.find(".entry-title a").attr("href");
      const imageUrl = $article.find(".apk-dl .icon img").attr("src");
      const rating = $article.find(".details-rating .average.rating").text().trim();
      const views = $article.find(".details-rating .details-delimiter").eq(1).text().replace(/\n|\|\s|\t/g, "").trim();
      const average = $article.find(".details-rating .stars").attr("title").trim();
      const updateDate = $article.find(".details-rating .update-date").next().text().trim();
      articles.push({
        title: title,
        titleUrl: titleUrl,
        imageUrl: imageUrl,
        rating: rating,
        average: average,
        views: views,
        updateDate: updateDate
      });
    });
    return articles;
  } catch (error) {
    throw new Error("Error fetching data: " + error.message);
  }
}
async function getApk4all(url) {
  try {
    const response = await fetch(randomProxyUrl + url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const info = {
      title: $(".dllinks .da").attr("title"),
      link: $(".dllinks .da").attr("href"),
      ogImageUrl: $('meta[property="og:image"]').attr("content"),
      developer: $('td:contains("Developer:")').next().text().trim(),
      currentVersion: $('td:contains("Current Version:")').next().text().trim(),
      latestUpdate: $('td:contains("Latest Update:")').next().find("time").text().trim(),
      contentRating: $('td:contains("Content Rating:")').next().text().trim(),
      getItOn: $('td:contains("Get it on:")').next().find("a").attr("href"),
      requirements: $('td:contains("Requirements:")').next().find("a").text().trim(),
      appID: $('td:contains("App ID:")').next().text().trim()
    };
    const response2 = await fetch(randomProxyUrl + info.link);
    const html2 = await response2.text();
    const $two = cheerio.load(html2);
    return {
      info: info,
      download: {
        title: $two(".box h1.title").text().trim(),
        linkFull: $two(".box p.field a.button.is-danger").attr("href"),
        linkMod: $two(".box div.buttons div.field p.control a.button.is-primary").attr("href"),
        size: $two(".box div.field.has-addons p.control.is-expanded a.button.is-primary").text().trim(),
        qr: $two(".box div.field.has-addons p.control a.zb.button.is-primary img.qr").attr("src"),
        guide: $two(".box div.block.content.notification.is-info.is-light.container").text().trim()
      }
    };
  } catch (error) {
    throw new Error("Error fetching additional information: " + error.message);
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  if (method === "GET") {
    const {
      action,
      query,
      url
    } = req.method === "GET" ? req.query : req.body;
    try {
      if (action === "search") {
        if (!query) {
          return res.status(400).json({
            message: "Query is required"
          });
        }
        const results = await searchApk4all(query);
        return res.status(200).json(results);
      } else if (action === "get") {
        if (!url) {
          return res.status(400).json({
            message: "URL is required"
          });
        }
        const apkDetails = await getApk4all(url);
        return res.status(200).json(apkDetails);
      } else {
        return res.status(400).json({
          message: "Invalid action"
        });
      }
    } catch (error) {
      return res.status(500).json({
        message: error.message
      });
    }
  } else {
    return res.status(405).json({
      message: "Method not allowed"
    });
  }
}