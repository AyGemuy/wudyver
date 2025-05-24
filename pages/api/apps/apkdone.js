import apiConfig from "@/configs/apiConfig";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
async function searchApkdone(q) {
  const url = `https://apkdone.mobi/?s=${encodeURIComponent(q)}&post_type=post`;
  try {
    const response = await fetch(randomProxyUrl + encodeURIComponent(url));
    const html = await response.text();
    const $ = cheerio.load(html);
    const result = [];
    $("a.column.app").each((index, element) => {
      const item = {
        href: $(element).attr("href"),
        title: $(element).attr("title"),
        imageSrc: $(element).find("img").attr("src"),
        appName: $(element).find("b").text(),
        version: $(element).find(".tag.vs").text(),
        downloads: $(element).find(".tag").eq(1).text().trim(),
        category: $(element).find("span").last().text()
      };
      result.push(item);
    });
    return result;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}
async function getApkdone(url) {
  const response = await fetch(randomProxyUrl + encodeURIComponent(url.endsWith("/download") ? url : url + "/download"));
  const html = await response.text();
  const $ = cheerio.load(html);
  const imageLink = $("article.column.app.is-large img").attr("src");
  const links = $('script[type="text/javascript"]').map((index, element) => $(element).html()).get().filter(scriptText => scriptText.includes("hole.apkdone.download")).map(scriptText => scriptText.match(/https?:\/\/hole\.apkdone\.download\/[^\s]+/g)).filter(matches => matches !== null).flat().map(link => link.replace(/"$/, ""));
  return {
    links: links,
    ogImageUrl: imageLink
  };
}
export default async function handler(req, res) {
  const {
    method
  } = req;
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
      const results = await searchApkdone(query);
      return res.status(200).json(results);
    } else if (action === "detail") {
      if (!url) {
        return res.status(400).json({
          message: "URL is required"
        });
      }
      const apkInfo = await getApkdone(url);
      return res.status(200).json(apkInfo);
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