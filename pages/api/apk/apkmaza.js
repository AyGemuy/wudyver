import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = ["https://thingproxy.freeboard.io/fetch/", "https://cors.newfrontdoor.org/api/cors?url=", "https://api.allorigins.win/raw?url="];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
async function searchApkmaza(query) {
  try {
    const response = await fetch(randomProxyUrl + `https://apkmaza.co/?s=${encodeURIComponent(query)}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const objArray = [];
    $(".hentry").each((index, element) => {
      const entry = $(element);
      const link = entry.find("a");
      const image = entry.find("img");
      const title = entry.find("h3");
      const version = entry.find(".small.text-truncate.text-muted.d-flex.align-items-center svg + span");
      const category = entry.find(".small.text-truncate.text-muted.d-flex.align-items-center .text-truncate");
      const description = entry.find(".small.text-muted.d-flex.align-items-center + .small.text-muted.d-flex.align-items-center span");
      const obj = {
        link: link.attr("href"),
        imageSrc: image.attr("src"),
        title: title.text(),
        version: version.text(),
        category: category.text(),
        description: description.text().trim()
      };
      objArray.push(obj);
    });
    return objArray;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}
async function getApkmaza(url) {
  try {
    const response = await fetch(randomProxyUrl + (url.endsWith("/download") ? url : url + "/download"));
    const html = await response.text();
    const $ = cheerio.load(html);
    const sections = [];
    $(".accordion-downloads .toggle").each((index, element) => {
      const section = {
        title: $(element).text().trim(),
        link: $(element).attr("href"),
        downloadLink: $(element).next(".collapse").find("a").attr("href"),
        fileSize: $(element).next(".collapse").find("a .whites").text().trim()
      };
      sections.push(section);
    });
    return sections;
  } catch (error) {
    console.error("Error:", error);
    return [];
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
        const results = await searchApkmaza(query);
        return res.status(200).json(results);
      } else if (action === "get") {
        if (!url) {
          return res.status(400).json({
            message: "URL is required"
          });
        }
        const appDetails = await getApkmaza(url);
        return res.status(200).json(appDetails);
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