import apiConfig from "@/configs/apiConfig";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
async function searchApk4free(query) {
  const url = `https://apk4free.net/?s=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(randomProxyUrl + encodeURIComponent(url));
    const html = await response.text();
    const $ = cheerio.load(html);
    const articles = [];
    $("article").each((index, element) => {
      const $article = $(element);
      articles.push({
        title: $article.find("h1.title a").text(),
        url: $article.find("h1.title a").attr("href"),
        thumbnail: $article.find(".featured-image .thumb.hover-effect span.fullimage").css("background-image").replace(/url\((.*)\)/, "$1"),
        category: $article.find('.tags a[href^="https://apk4free.net/category/"]').map((_, tagElement) => $(tagElement).text()).get(),
        tag: $article.find('.tags a[href^="https://apk4free.net/tag/"]').map((_, tagElement) => $(tagElement).text()).get(),
        description: $article.find(".post-excerpt p").text(),
        author: {
          name: $article.find("footer.author-meta a .author-name").text(),
          image: $article.find("footer.author-meta a .author-image").css("background-image").replace(/url\('(.*)'\)/, "$1"),
          count: $article.find("footer.author-meta a .author-count").text().replace(" Resources", "")
        }
      });
    });
    return articles;
  } catch (error) {
    throw new Error("Error fetching data: " + error.message);
  }
}
async function getApk4free(url) {
  try {
    const response = await fetch(randomProxyUrl + encodeURIComponent(url));
    const html = await response.text();
    const $ = cheerio.load(html);
    const data = [];
    $('section.post-content p, .slider img, strong a[href^="https://"]').each((_, element) => {
      const $element = $(element);
      if ($element.is("p")) {
        const content = $element.text().trim();
        if (content) {
          data.push({
            type: "text",
            content: content
          });
        }
      } else if ($element.is("img")) {
        let src = $element.attr("src");
        if (src.startsWith("//")) src = "https:" + src;
        data.push({
          type: "image",
          src: src
        });
      } else if ($element.is("a")) {
        let link = $element.attr("href");
        if (link.startsWith("//")) link = "https:" + link;
        data.push({
          type: "download",
          link: link
        });
      }
    });
    return data.reduce((result, item) => {
      const {
        type,
        content,
        src,
        link
      } = item;
      if (type === "text") {
        result.text = result.text || [];
        result.text.push(content);
      } else if (type === "image") {
        result.image = result.image || [];
        result.image.push(src);
      } else if (type === "download") {
        result.download = result.download || [];
        result.download.push(link);
      }
      return result;
    }, {});
  } catch (error) {
    throw new Error("Error fetching additional information: " + error.message);
  }
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
      const results = await searchApk4free(query);
      return res.status(200).json(results);
    } else if (action === "detail") {
      if (!url) {
        return res.status(400).json({
          message: "URL is required"
        });
      }
      const apkDetails = await getApk4free(url);
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
}