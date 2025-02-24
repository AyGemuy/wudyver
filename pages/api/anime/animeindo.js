import fetch from "node-fetch";
import * as cheerio from "cheerio";
class Animeindo {
  async latest() {
    try {
      const body = await (await fetch("https://anime-indo.lol/")).text();
      const $ = cheerio.load(body);
      return $(".ngiri .menu .list-anime").map((_, el) => {
        const relativeLink = $(el).find("a").attr("href") || "";
        const fullLink = relativeLink ? `https://anime-indo.lol${relativeLink}` : "";
        const imageUrl = $(el).find("img.lazy").attr("data-original") || "";
        return {
          title: $(el).find("p").text().trim(),
          episode: $(el).find(".eps").text().trim(),
          imageUrl: imageUrl,
          link: fullLink
        };
      }).get();
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  }
  async search(query) {
    try {
      const searchUrl = `https://anime-indo.lol/search.php?q=${encodeURIComponent(query)}`;
      const body = await (await fetch(searchUrl)).text();
      const $ = cheerio.load(body);
      return $(".menu .otable").map((_, el) => {
        const title = $(el).find(".videsc a").text().trim();
        const link = $(el).find(".videsc a").attr("href");
        const imageUrl = $(el).find(".vithumb img").attr("src");
        const description = $(el).find(".des").text().trim();
        return {
          title: title,
          link: link ? `https://anime-indo.lol${link}` : "",
          imageUrl: imageUrl ? `https://anime-indo.lol${imageUrl}` : "",
          description: description
        };
      }).get();
    } catch (error) {
      console.error("Error during search:", error);
      return [];
    }
  }
  async detail(url) {
    try {
      const body = await (await fetch(url)).text();
      const $ = cheerio.load(body);
      const title = $("h1.title").text().trim();
      const description = $(".menu .detail p").text().trim();
      const genres = $(".menu .detail li a").map((_, el) => $(el).text().trim()).get();
      const imageUrl = $(".menu .detail img").attr("src") || "";
      const episodeLinks = $(".menu .ep a").map((_, el) => ({
        episode: $(el).text().trim(),
        link: `https://anime-indo.lol${$(el).attr("href")}`
      })).get();
      return {
        title: title,
        description: description,
        genres: genres,
        imageUrl: imageUrl,
        episodes: episodeLinks
      };
    } catch (error) {
      console.error("Error fetching anime details:", error);
      return {};
    }
  }
  async download(url) {
    try {
      const res = await fetch(url);
      const body = await res.text();
      const $ = cheerio.load(body);
      const title = $("h1.title").text();
      const buttons = $(".servers a").map((_, el) => {
        const link = $(el).attr("data-video");
        const name = $(el).text().trim();
        return link && name ? {
          title: `Download: ${name}`,
          url: link
        } : null;
      }).get();
      return {
        title: title,
        buttons: buttons
      };
    } catch (err) {
      console.error("Error:", err);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    method,
    query
  } = req;
  const animeindo = new Animeindo();
  try {
    const {
      action,
      url,
      q
    } = query;
    switch (action) {
      case "latest":
        const latestAnimes = await animeindo.latest();
        return res.status(200).json({
          data: latestAnimes
        });
      case "search":
        if (!q) return res.status(400).json({
          error: 'Query parameter "q" is required'
        });
        const searchResults = await animeindo.search(q);
        return res.status(200).json({
          data: searchResults
        });
      case "detail":
        if (!url) return res.status(400).json({
          error: 'URL parameter "url" is required'
        });
        const animeDetail = await animeindo.detail(url);
        return res.status(200).json({
          data: animeDetail
        });
      case "download":
        if (!url) return res.status(400).json({
          error: 'URL parameter "url" is required'
        });
        const downloadData = await animeindo.download(url);
        return res.status(200).json({
          data: downloadData
        });
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}