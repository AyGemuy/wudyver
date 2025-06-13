import apiConfig from "@/configs/apiConfig";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`;
const fetchHtml = async url => {
  const response = await fetch(proxyUrl + encodeURIComponent(url));
  return response.text();
};
const parseSearchResults = html => {
  const $ = cheerio.load(html);
  const results = [];
  $('ul[data-meta="search-results-list"] li').each((_, el) => {
    const $el = $(el);
    results.push({
      title: $el.find('h2[data-meta="program-name"]').text().trim(),
      link: $el.find('a[data-meta="program-item"]').attr("href"),
      icon: $el.find('img[data-meta="icon"]').attr("src"),
      license: $el.find('p[data-meta="program-license"]').text().trim(),
      summary: $el.find('p[data-meta="program-summary"]').text().trim()
    });
  });
  return results;
};
const parseHippoPage = html => {
  const $ = cheerio.load(html);
  const breadcrumbs = $('li[property="itemListElement"] a').map((_, el) => ({
    name: $(el).find('span[property="name"]').text().trim(),
    link: $(el).attr("href")
  })).get();
  return {
    breadcrumbs: breadcrumbs,
    mainProgram: {
      title: $('h1[data-meta="name"]').text().trim(),
      link: $('h1[data-meta="name"] a').attr("href"),
      icon: $('div[data-meta="program-header"] img').attr("src"),
      download: $('a[data-meta="download-again-internal"]').attr("href")
    },
    relatedPrograms: $('ul[data-meta="section-related-software"] li a').map((_, el) => ({
      name: $(el).attr("title"),
      link: $(el).attr("href"),
      icon: $(el).find("img").attr("src")
    })).get()
  };
};
const searchHippo = async app_name => {
  try {
    return parseSearchResults(await fetchHtml(`https://filehippo.com/search/?q=${encodeURIComponent(app_name)}`));
  } catch (error) {
    throw new Error("Gagal mencari aplikasi");
  }
};
const getHippo = async url => {
  try {
    return parseHippoPage(await fetchHtml(url));
  } catch (error) {
    throw new Error("Gagal mencari aplikasi");
  }
};
export default async function handler(req, res) {
  const {
    action,
    query: app_name
  } = req.method === "GET" ? req.query : req.body;
  try {
    const result = action === "search" ? await searchHippo(app_name) : action === "detail" ? await getHippo(app_name) : null;
    return result ? res.status(200).json(result) : res.status(400).json({
      message: "Invalid action"
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}