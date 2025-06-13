import fetch from "node-fetch";
import * as cheerio from "cheerio";
class Oploverz {
  constructor(baseUrl = "https://oploverz.org") {
    this.baseUrl = baseUrl;
  }
  async search(query) {
    try {
      const url = `${this.baseUrl}/?q=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      const $ = cheerio.load(await response.text());
      return $(".bg-white.shadow.xrelated.relative").map((_, element) => ({
        title: $(element).find(".titlelist.tublok").text() || "",
        link: $(element).find("a").attr("href") || "",
        image: $(element).find("img").attr("src") || "",
        episodes: $(element).find(".eplist").text() || "",
        rating: $(element).find(".starlist").text().trim() || "N/A"
      })).get();
    } catch (error) {
      console.error("Error in search:", error);
      return null;
    }
  }
  async ongoing() {
    try {
      const response = await fetch(`${this.baseUrl}/ongoing/`);
      const html = await response.text();
      const $ = cheerio.load(html);
      return $(".bg-white.shadow.xrelated.relative").map((i, el) => ({
        title: $(el).find(".titlelist.tublok").text().trim() || "No Title",
        url: $(el).find("a").attr("href") || "No URL",
        imgSrc: $(el).find("img").attr("src") || "No Image",
        episodes: $(el).find(".eplist").text().trim() || "No Episodes",
        rating: $(el).find(".starlist").text().trim() || "N/A"
      })).get();
    } catch (error) {
      console.error("Error fetching ongoing data:", error);
      return null;
    }
  }
  async complete() {
    try {
      const response = await fetch(`${this.baseUrl}/complete/`);
      const html = await response.text();
      const $ = cheerio.load(html);
      return $(".bg-white.shadow.xrelated.relative").map((i, el) => ({
        title: $(el).find(".titlelist.tublok").text().trim() || "No Title",
        url: $(el).find("a").attr("href") || "No URL",
        imgSrc: $(el).find("img").attr("src") || "No Image",
        episodes: $(el).find(".eplist").text().trim() || "No Episodes",
        rating: $(el).find(".starlist").text().trim() || "N/A"
      })).get();
    } catch (error) {
      console.error("Error fetching complete data:", error);
      return null;
    }
  }
  async episode(url) {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      return {
        title: $(".sinops > b").text().replace("Sinopsis : ", "") || "",
        synopsis: $(".sinops").contents().not("b, hr").text().trim() || "",
        imageUrl: $(".cover").attr("src") || "",
        episodes: $(".othereps").map((_, el) => `${this.baseUrl}${$(el).attr("href") || ""}`).get()
      };
    } catch (error) {
      console.error("Error fetching episode data:", error);
      return null;
    }
  }
  async random() {
    try {
      const response = await fetch(`${this.baseUrl}/random/`);
      const html = await response.text();
      const $ = cheerio.load(html);
      return {
        title: $(".sinops > b").text().replace("Sinopsis : ", "") || "",
        synopsis: $(".sinops").contents().not("b, hr").text().trim() || "",
        imageUrl: $(".cover").attr("src") || "",
        episodes: $(".othereps").map((_, el) => `${this.baseUrl}${$(el).attr("href") || ""}`).get()
      };
    } catch (error) {
      console.error("Error fetching random anime:", error);
      return null;
    }
  }
  async download(url) {
    try {
      const html = await (await fetch(url)).text();
      const $ = cheerio.load(html);
      const title = $("h1.title-post").text().trim() || "No title";
      const date = $(".date").text().trim() || "No date";
      const iframeSrc = $("#istream").attr("src") || "No iframe";
      const downloadLinks = $("#contdl .links_table tbody tr").map((_, row) => {
        const server = $(row).find("td").eq(0).text().replace(/<[^>]*>/g, "").trim().toLowerCase() || "no_server";
        const quality = $(row).find("td").eq(1).text().replace(/<[^>]*>/g, "").trim().toLowerCase().split(" ")[0] || "no_quality";
        const link = this.baseUrl + ($(row).find("td").eq(2).find("a").attr("href") || "");
        return {
          server: server,
          quality: quality,
          link: link
        };
      }).get();
      const formattedLinks = downloadLinks.reduce((acc, {
        server,
        quality,
        link
      }) => {
        acc[server] = {
          ...acc[server],
          [quality]: link
        };
        return acc;
      }, {});
      return {
        title: title,
        date: date,
        iframeSrc: iframeSrc,
        downloadLinks: formattedLinks
      };
    } catch (error) {
      console.error("Error fetching download links:", error);
      return null;
    }
  }
  async gen(url, option = null) {
    try {
      const regex = /var\s+gotoz\s*=\s*"([^"]*)"/;
      const response = await fetch(url);
      const html = await response.text();
      const match = html.match(regex);
      if (!match) throw new Error("Regex match failed");
      return {
        generatedLink: match[1],
        option: option
      };
    } catch (error) {
      console.error("Error generating link:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const oploverz = new Oploverz();
  try {
    switch (action) {
      case "search":
        if (!query) {
          return res.status(400).json({
            error: "Query parameter is required"
          });
        }
        const searchResults = await oploverz.search(query);
        return res.status(200).json({
          success: true,
          results: searchResults
        });
      case "ongoing":
        const ongoingResults = await oploverz.ongoing();
        return res.status(200).json({
          success: true,
          results: ongoingResults
        });
      case "complete":
        const completeResults = await oploverz.complete();
        return res.status(200).json({
          success: true,
          results: completeResults
        });
      case "episode":
        if (!url) {
          return res.status(400).json({
            error: "URL parameter is required"
          });
        }
        const episodeResults = await oploverz.episode(url);
        return res.status(200).json({
          success: true,
          results: episodeResults
        });
      case "random":
        const randomResults = await oploverz.random();
        return res.status(200).json({
          success: true,
          results: randomResults
        });
      case "download":
        if (!url) {
          return res.status(400).json({
            error: "URL parameter is required"
          });
        }
        const downloadResults = await oploverz.download(url);
        return res.status(200).json({
          success: true,
          results: downloadResults
        });
      case "gen":
        if (!url) {
          return res.status(400).json({
            error: "URL parameter is required"
          });
        }
        const genResults = await oploverz.gen(url);
        return res.status(200).json({
          success: true,
          results: genResults
        });
      default:
        return res.status(400).json({
          error: "Invalid action parameter"
        });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}