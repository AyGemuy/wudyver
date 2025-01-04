import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = ["https://thingproxy.freeboard.io/fetch/", "https://cors.newfrontdoor.org/api/cors?url=", "https://api.allorigins.win/raw?url="];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
async function searchHippo(app_name) {
  const url = "https://filehippo.com/search/?q=" + encodeURIComponent(app_name);
  try {
    const response = await fetch(randomProxyUrl + url);
    const html = await response.text();
    const $ = cheerio.load(html);
    return (await Promise.all($(".list-programs__item").map(async (index, element) => {
      const title = $(".card-program__title", element).text().trim(),
        link = $(".card-program", element).attr("href"),
        image = $(".media__image img", element).attr("src"),
        developer = $(".card-program__developer", element).text().trim(),
        license = $(".card-program__license", element).text().trim(),
        summary = $(".card-program__summary", element).text().trim();
      if (title && link && image && developer && license && summary) return {
        title: title,
        link: link,
        image: image,
        developer: developer,
        license: license,
        summary: summary
      };
    }).get())).filter(Boolean);
  } catch (error) {
    console.error("Error in searchHippo:", error);
    throw new Error("Gagal mencari aplikasi");
  }
}
async function getHippo(app_name) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/18.17763"
  };
  const urls = {
    information: app_name.endsWith("/") ? app_name : app_name + "/",
    download: (app_name.endsWith("/") ? app_name : app_name + "/") + "post_download/"
  };
  try {
    const [html, downloadHtml] = await Promise.all(Object.values(urls).map(url => fetch(randomProxyUrl + url, {
      headers: headers
    }).then(response => response.text())));
    const $ = cheerio.load(html);
    const name = $("body > div.page > div:nth-child(2) > div > div > div > section.program-header-content > div.program-header-content__main > div > div.media__body > h1").text(),
      information = $("body > div.page > div:nth-child(2) > div > div > div > section.mb-l > article > p:nth-child(3)").text(),
      version = $("body > div.page > div:nth-child(2) > div > div > div > section.program-header-content > div.program-header-content__main > div > div.media__body > p.program-header__version").text(),
      icon_url = $("body > div.page > div:nth-child(2) > div > div > div > section.program-header-content > div.program-header-content__main > div > div.media__image > img").attr("src"),
      download_url = cheerio.load(downloadHtml)("script[data-qa-download-url]").attr("data-qa-download-url"),
      mimetype = await getMimeTypeFromUrl(download_url);
    return [{
      name: name,
      version: version,
      information: information,
      html_url: urls.information,
      download_url: download_url,
      icon_url: icon_url,
      app_name: app_name,
      mimetype: mimetype
    }];
  } catch (error) {
    console.error("Error in getHippo:", error);
    throw new Error("Gagal mendapatkan informasi aplikasi");
  }
}
async function getMimeTypeFromUrl(url) {
  try {
    const response = await fetch(randomProxyUrl + url);
    if (response.ok) {
      return response.headers.get("content-type");
    }
    throw new Error("Failed to fetch URL");
  } catch (error) {
    console.error("Error in getMimeTypeFromUrl:", error);
    return "unknown";
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  if (method === "GET") {
    const {
      action,
      app_name
    } = req.method === "GET" ? req.query : req.body;
    try {
      if (action === "search") {
        const results = await searchHippo(app_name);
        return res.status(200).json(results);
      } else if (action === "get") {
        const result = await getHippo(app_name);
        return res.status(200).json(result);
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