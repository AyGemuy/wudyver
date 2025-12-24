import fetch from "node-fetch";
import * as cheerio from "cheerio";
export default async function handler(req, res) {
  const {
    action,
    query,
    id
  } = req.method === "GET" ? req.query : req.body;
  if (action === "search" && query) {
    try {
      const searchResults = await sogame(query);
      return res.status(200).json({
        results: searchResults
      });
    } catch (error) {
      console.error("Error searching for game:", error);
      return res.status(500).json({
        error: "Failed to fetch search results"
      });
    }
  }
  if (action === "detail" && id) {
    try {
      const modData = await getModData(id);
      return res.status(200).json(modData);
    } catch (error) {
      console.error("Error fetching mod data:", error);
      return res.status(500).json({
        error: "Failed to fetch mod data"
      });
    }
  }
  return res.status(400).json({
    error: "Invalid action or missing query/id"
  });
}
async function sogame(query) {
  try {
    const res = await fetch(`https://so.3dmgame.com/?keyword=${query}&subsearch=1&type=5`);
    const body = await res.text();
    const $ = cheerio.load(body);
    const results = [];
    $(".search_lis.lis_djxz").each((index, element) => {
      const title = $(element).find("a.bt").text().replace(/<em>|<\/em>/g, "").trim();
      const link = $(element).find("a.bt").attr("href");
      const image = $(element).find("a.img img").attr("src");
      const type = $(element).find(".info li").eq(0).find("p").eq(0).text().replace("类型：", "").trim();
      const heat = $(element).find(".info li").eq(0).find("p").eq(1).text().replace("热度：", "").trim();
      const score = $(element).find(".info li").eq(1).find("p").eq(0).text().replace("评分：", "").trim();
      const language = $(element).find(".info li").eq(1).find("p").eq(1).text().replace("语言：", "").trim();
      results.push({
        title: title,
        link: link,
        image: image,
        type: type,
        heat: heat,
        score: score,
        language: language
      });
    });
    return results;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}
async function getModData(id) {
  const url = "https://mod.3dmgame.com/api/v2/GetModData";
  const headers = {
    Authorization: "67d8667248a801ff6ddc74ac43016168",
    "Content-Type": "application/json"
  };
  const body = JSON.stringify({
    mod_id: id
  });
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body
    });
    if (!response.ok) {
      throw new Error("Failed to fetch mod data");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching mod data:", error);
    throw error;
  }
}