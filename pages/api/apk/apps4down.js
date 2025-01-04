import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = ["https://thingproxy.freeboard.io/fetch/", "https://cors.newfrontdoor.org/api/cors?url=", "https://api.allorigins.win/raw?url="];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
async function searchApps4(query) {
  const url = `https://www.apps4download.com/?s=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(randomProxyUrl + url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const sections = [];
    $(".bloque-app").each((index, element) => {
      const section = {
        href: $(element).find("a").attr("href"),
        imageSrc: $(element).find("img").attr("data-src"),
        altText: $(element).find("img").attr("alt"),
        title: $(element).find(".title").text().trim(),
        developer: $(element).find(".developer").text().trim(),
        version: $(element).find(".version").text().trim(),
        rating: $(element).find(".stars").attr("style")?.match(/width:(\d+)%/)?.[1] || "N/A"
      };
      sections.push(section);
    });
    return sections;
  } catch (error) {
    console.log("Terjadi kesalahan:", error);
    return [];
  }
}
async function getDownloadLinks(url) {
  try {
    const response = await fetch(randomProxyUrl + (url.endsWith("/?download=links") ? url : `${url}/?download=links`));
    const html = await response.text();
    const $ = cheerio.load(html);
    const gdl = $("ul.show_download_links > li > a").map((index, element) => ({
      downloadLink: $(element).attr("href"),
      title: $(element).text().trim()
    })).get();
    if (gdl.length > 0) {
      const metaData = await getMetaData(gdl[0]?.downloadLink);
      return metaData;
    }
  } catch (error) {
    console.log("Terjadi kesalahan:", error);
    return null;
  }
}
async function getMetaData(url) {
  try {
    const response = await fetch(randomProxyUrl + url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const metaTags = $('meta[property^="og"]');
    const metaData = {};
    metaTags.each((index, element) => {
      const property = $(element).attr("property");
      const content = $(element).attr("content");
      metaData[property.slice(3)] = content;
    });
    return metaData;
  } catch (error) {
    console.log("Terjadi kesalahan:", error);
    return null;
  }
}
async function mediafireDl(url) {
  try {
    const res = await fetch(randomProxyUrl + url);
    const $ = cheerio.load(await res.text());
    const results = [];
    const link = $("a#downloadButton").attr("href");
    const size = $("a#downloadButton").text().replace("Download", "").replace("(", "").replace(")", "").replace("\n", "").trim();
    const nama = link.split("/")[5];
    const mime = nama.split(".")[1];
    results.push({
      nama: nama,
      mime: mime,
      size: size,
      link: link
    });
    return results;
  } catch (error) {
    console.log("Terjadi kesalahan:", error);
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
        const results = await searchApps4(query);
        return res.status(200).json(results);
      } else if (action === "getDownloadLinks") {
        if (!url) {
          return res.status(400).json({
            message: "URL is required"
          });
        }
        const downloadLinks = await getDownloadLinks(url);
        return res.status(200).json(downloadLinks);
      } else if (action === "getMetaData") {
        if (!url) {
          return res.status(400).json({
            message: "URL is required"
          });
        }
        const metaData = await getMetaData(url);
        return res.status(200).json(metaData);
      } else if (action === "mediafireDl") {
        if (!url) {
          return res.status(400).json({
            message: "URL is required"
          });
        }
        const mediafireData = await mediafireDl(url);
        return res.status(200).json(mediafireData);
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