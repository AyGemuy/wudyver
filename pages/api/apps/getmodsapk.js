import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function searchGetmodsapk(query) {
  const searchUrl = `https://getmodsapk.com/search/${encodeURIComponent(query)}`;
  try {
    const response = await fetch(searchUrl);
    const html = await response.text();
    const $ = cheerio.load(html);
    const data = [];
    $(".post-item").each((index, element) => {
      const post = {
        title: $(element).find(".post-content h3 a").text().trim().replace(/\s+/g, " "),
        url: $(element).find(".post-content h3 a").attr("href"),
        image: encodeURI($(element).find(".post-content img").attr("src").trim().replace(/\s+/g, " ")),
        label: $(element).find(".post-content .label").text().trim().replace(/\s+/g, " "),
        category: $(element).find(".post-content p").text().trim().replace(/\s+/g, " "),
        version: $(element).find("li:nth-child(2) .text-gray-500").text().trim().replace(/\s+/g, " "),
        size: $(element).find("li:nth-child(3) .text-gray-500").text().trim().replace(/\s+/g, " ")
      };
      data.push(post);
    });
    return data;
  } catch (error) {
    console.log("Terjadi kesalahan:", error);
    return [];
  }
}
async function getLinks(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const downloadElement = $("#download a");
    const downloadLink = downloadElement.attr("href");
    const downloadText = downloadElement.text().trim();
    const downloadSizeMatch = downloadText.match(/\((\d+)\sMB\)/);
    return {
      link: downloadLink,
      text: downloadText,
      size: downloadSizeMatch ? downloadSizeMatch[1] : ""
    };
  } catch (error) {
    console.log("Terjadi kesalahan:", error);
    return null;
  }
}
async function getLinkList(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const downloadItems = [];
    $("li.mb-2").each((index, element) => {
      const spanElement = $(element).find("span.closed");
      const downloadLinkElement = $(element).find("div a");
      const downloadSizeMatch = downloadLinkElement.text().match(/APK (\d+.\d+) MB/);
      downloadItems.push({
        title: spanElement.text().trim(),
        link: downloadLinkElement.attr("href"),
        size: downloadSizeMatch ? downloadSizeMatch[1] : ""
      });
    });
    return downloadItems;
  } catch (error) {
    console.log("Terjadi kesalahan:", error);
    return null;
  }
}
async function getDown(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const ogImageElement = $('meta[property="og:image"]');
    const ogTitleElement = $('meta[property="og:title"]');
    const downloadLinkElement = $("div[download-process-box]").next("a[download-button]");
    const downloadSizeMatch = downloadLinkElement.text().match(/APK (\d+.\d+) MB/);
    return {
      ogImage: ogImageElement.attr("content"),
      ogTitle: ogTitleElement.attr("content"),
      link: encodeURI(downloadLinkElement.attr("href")),
      size: downloadSizeMatch ? downloadSizeMatch[1] : ""
    };
  } catch (error) {
    console.log("Terjadi kesalahan:", error);
    return null;
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    action,
    query
  } = req.method === "GET" ? req.query : req.body;
  try {
    if (action === "search") {
      const results = await searchGetmodsapk(query);
      return res.status(200).json(results);
    } else if (action === "link") {
      const result = await getLinks(query);
      return res.status(200).json(result);
    } else if (action === "list") {
      const result = await getLinkList(query);
      return res.status(200).json(result);
    } else if (action === "download") {
      const result = await getDown(query);
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
}