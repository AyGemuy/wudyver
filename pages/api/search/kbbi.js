import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function kbbi(words) {
  const response = await fetch(`https://kbbi.kemdikbud.go.id/entri/${encodeURIComponent(words)}`);
  if (!response.ok) {
    throw new Error("Network response was not ok " + response.statusText);
  }
  const html = await response.text();
  const $ = cheerio.load(html);
  const isExist = !/tidak ditemukan/i.test($('body > div.container.body-content > h4[style="color:red"]').text());
  if (!isExist) {
    throw new Error(`${words} does not exist!`);
  }
  const results = [];
  let isContent = false;
  let lastTitle;
  $("body > div.container.body-content").children().each((_, el) => {
    const tag = el.tagName;
    const elem = $(el);
    if (tag === "hr") {
      isContent = !isContent && !results.length;
    }
    if (tag === "h2" && isContent) {
      const index = elem.find("sup").text().trim();
      const title = elem.text().trim();
      results.push({
        index: parseInt(index) || 0,
        title: title,
        means: []
      });
      lastTitle = title;
    }
    if ((tag === "ol" || tag === "ul") && isContent && lastTitle) {
      elem.find("li").each((_, el) => {
        const li = $(el).text().trim();
        const index = results.findIndex(({
          title
        }) => title === lastTitle);
        if (index !== -1) {
          results[index].means.push(li);
        } else {
          console.log(li, lastTitle);
        }
      });
      lastTitle = "";
    }
  });
  if (results.length === 0) {
    throw new Error(`${words} does not exist!\n\n${html}`);
  }
  return results;
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  if (method === "GET") {
    const {
      query: word
    } = req.method === "GET" ? req.query : req.body;
    try {
      const results = await kbbi(word);
      return res.status(200).json(results);
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