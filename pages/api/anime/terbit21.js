import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class MovieSearch {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://tv.terbit21.website",
        referer: "https://tv.terbit21.website/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    }));
    this.baseUrl = "https://tv.terbit21.website/?s=";
    this.baseDownloadUrl = "https://tv.terbit21.website/download";
  }
  async search(query) {
    try {
      const url = `${this.baseUrl}${encodeURIComponent(query)}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      return $(".grid-item").map((i, el) => {
        const link = $(el).find("h2 a").attr("href") || "#";
        if (!link.startsWith("https")) return null;
        const id = link.split("/").slice(-2, -1)[0];
        return {
          id: id,
          title: $(el).find("h2 a").text().trim() || "No Title",
          link: link,
          image: $(el).find(".thumbnail img").attr("src") || "No Image",
          rating: $(el).find(".rating").text().trim() || "No Rating",
          duration: $(el).find(".duration").text().trim() || "No Duration",
          genres: $(el).find(".cat-links a").map((j, em) => $(em).text()).get() || ["No Genre"]
        };
      }).get().filter(Boolean);
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  }
  async detail(urlOrId) {
    try {
      const movieName = typeof urlOrId === "string" ? urlOrId.split("/").slice(-2, -1)[0].replace(/-/g, " ") : urlOrId;
      const response = await this.client.post("https://t21.press/data.php", `movie=${encodeURIComponent(movieName)}`);
      const $ = cheerio.load(response.data);
      const id = typeof urlOrId === "string" ? urlOrId.split("/").slice(-2, -1)[0] : urlOrId;
      const servers = $("div").map((i, el) => {
        const link = $(el).find("a").attr("href");
        if (!link || !link.startsWith("https")) return null;
        const title = $(el).find("a").text().trim();
        const server = $(el).find("a").attr("class");
        return {
          title: title,
          link: link,
          server: server
        };
      }).get().filter(Boolean);
      const verifyingResponse = await this.client.post(`https://t21.press/verifying.php?movie=${encodeURIComponent(movieName)}`, `movie=${encodeURIComponent(movieName)}`);
      const verifyingData = verifyingResponse.data;
      const downloadLinks = $(verifyingData).find("a").filter((i, el) => $(el).text().toLowerCase().includes("download")).map((i, el) => {
        const href = $(el).attr("href");
        return href.startsWith("http") ? href : null;
      }).get().filter(Boolean);
      const redirectLinks = await this.getRedirectLinks(downloadLinks);
      return {
        id: id,
        server: servers,
        dl_link: `${this.baseDownloadUrl}/${id}`,
        media: redirectLinks
      };
    } catch (error) {
      console.error("Error fetching movie details:", error);
      return null;
    }
  }
  async getRedirectLinks(downloadLinks) {
    const redirectLinks = [];
    for (const link of downloadLinks) {
      try {
        const response = await this.client.get(link, {
          maxRedirects: 0
        });
        redirectLinks.push(response.request.res.responseUrl);
      } catch (error) {
        if (error.response && error.response.status === 302) {
          redirectLinks.push(error.response.headers.location);
        } else {
          console.error("Error fetching redirect link:", error);
        }
      }
    }
    const results = await Promise.all(redirectLinks.map(async redirectLink => {
      const {
        size,
        headers,
        base64Data
      } = await this.getFileSizeAndHeaders(redirectLink);
      return {
        url: redirectLink,
        size: size,
        headers: headers,
        base64Data: base64Data
      };
    }));
    return results;
  }
  async getFileSizeAndHeaders(url) {
    try {
      const response = await this.client.head(url, {
        headers: {
          Referer: "https://t21.press/"
        }
      });
      const size = response.headers["content-length"] ? this.formatSize(response.headers["content-length"]) : "Unknown Size";
      const mediaResponse = await this.client.get(url, {
        responseType: "arraybuffer",
        headers: {
          Referer: "https://t21.press/"
        }
      });
      const base64Data = Buffer.from(mediaResponse.data, "binary").toString("base64");
      return {
        size: size,
        headers: response.headers,
        base64Data: base64Data
      };
    } catch (error) {
      console.error("Error fetching file size:", error);
      return {
        size: "Error",
        headers: {},
        base64Data: null
      };
    }
  }
  formatSize(size) {
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    let index = 0;
    let formattedSize = parseFloat(size);
    while (formattedSize >= 1024 && index < units.length - 1) {
      formattedSize /= 1024;
      index++;
    }
    return `${formattedSize.toFixed(2)} ${units[index]}`;
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  try {
    let result;
    const movieSearch = new MovieSearch();
    switch (action) {
      case "search":
        if (!query) {
          return res.status(400).json({
            error: 'Query parameter "query" is required.'
          });
        }
        result = await movieSearch.search(query);
        break;
      case "detail":
        if (!url) {
          return res.status(400).json({
            error: 'Query parameter "url" is required.'
          });
        }
        result = await movieSearch.detail(url);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action."
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}