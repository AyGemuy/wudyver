import fetch from "node-fetch";
import * as cheerio from "cheerio";
class Zoro {
  async checkDub(episodeId) {
    try {
      const response = await fetch(`https://zoro.to/ajax/v2/episode/servers?episodeId=${episodeId}`);
      const resp = await response.json();
      const $ = cheerio.load(resp.html);
      const isDub = {};
      const hasClass = $("div").hasClass("servers-dub");
      isDub.dubAvailable = hasClass ? true : false;
      return isDub;
    } catch (err) {
      throw new Error("Error checking dub: " + err.message);
    }
  }
  async getSource(episodeId) {
    try {
      const response = await fetch(`https://api.consumet.org/anime/zoro/watch?episodeId=${episodeId}`);
      const resp = await response.json();
      return resp;
    } catch (err) {
      throw new Error("Error fetching source: " + err.message);
    }
  }
  async scrapeDetails(id) {
    try {
      const response = await fetch(`https://9anime.se/ajax/episode/list/${id}`);
      const res = await response.json();
      const $ = cheerio.load(res.html);
      let episodes = [];
      const zoroAnimeId = $("#episodes-page-1 a").attr("href").slice(7).split("?")[0];
      $("a").each((i, el) => {
        episodes.push({
          id: $(el).attr("data-id"),
          epNum: $(el).attr("data-number")
        });
      });
      const totalEp = res.totalItems;
      return {
        zoroAnimeId: zoroAnimeId,
        episodes: episodes,
        totalEp: totalEp
      };
    } catch (err) {
      throw new Error("Error scraping details: " + err.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    episodeId,
    id
  } = req.method === "GET" ? req.query : req.body;
  const zoro = new Zoro();
  try {
    let result;
    if (action === "dub" && episodeId) {
      result = await zoro.checkDub(episodeId);
    } else if (action === "source" && episodeId) {
      result = await zoro.getSource(episodeId);
    } else if (action === "detail" && id) {
      result = await zoro.scrapeDetails(id);
    } else {
      return res.status(400).json({
        error: "Invalid action or missing parameters"
      });
    }
    return res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}