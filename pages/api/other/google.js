import * as cheerio from "cheerio";
import fetch from "node-fetch";
async function googleit(query, page = 0) {
  const response = await fetch("https://www.google.com/search?" + new URLSearchParams({
    q: query,
    start: page * 10
  }), {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8"
    }
  });
  if (!response.ok) {
    throw new Error("Network response was not ok " + response.statusText);
  }
  const body = await response.text();
  const $ = cheerio.load(body);
  const title = $('div[data-attrid="title"][role="heading"]').text().trim();
  const type = $('div[data-attrid="subtitle"][role="heading"]').text().trim();
  const description = $("div.wDYxhc:not(.NFQFxe), div.wDYxhc.NFQFxe .V8fWH").map((_, el) => {
    const $el = $(el);
    $el.find(".SW5pqf").remove();
    $el.find("h3").remove();
    return $el.text().trim() || null;
  }).get().filter(Boolean).join("\n");
  const related = $(".related-question-pair span.CSkcDe").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const articles = $("#kp-wp-tab-overview div.TzHB6b").map((_, el) => {
    const $el = $(el);
    const $header = $el.find("div.q0vns");
    const header = $header.find("span.VuuXrf").first().text();
    const iconBase64 = $el.find("img.XNo5Ab").attr("src");
    const thumbnail = $el.find(".uhHOwf > img").attr("src");
    const url = $header.find("cite.qLRx3b").first().text().trim();
    const title = $el.find("h3").first().text().trim();
    const gif = $el.find("div.VYkpsb video").attr("src");
    const description = $el.find("div.VwiC3b").text().trim() || $el.find("div.fzUZNc").text().trim();
    const footer = $el.find(".ChPIuf").text().trim();
    if (!url) return null;
    return {
      url: url,
      header: header,
      thumbnail: thumbnail,
      iconBase64: iconBase64,
      title: title,
      gif: gif,
      description: description,
      footer: footer
    };
  }).get().filter(Boolean);
  return {
    title: title,
    type: type,
    description: description,
    related: related,
    articles: articles
  };
}
export default async function handler(req, res) {
  if (req.method === "GET") {
    const {
      query,
      page
    } = req.method === "GET" ? req.query : req.body;
    if (!query) {
      return res.status(400).json({
        error: "Parameter 'query' diperlukan"
      });
    }
    try {
      const result = await googleit(query, parseInt(page, 10) || 0);
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching Google results:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  }
  res.setHeader("Allow", ["GET"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}