import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
class PicJoke {
  constructor(url, fileContent) {
    this.url = url;
    this.fileContent = fileContent;
  }
  async fetchHtml(url) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching HTML from ${url}:`, error.message);
      return null;
    }
  }
  filterUrl(url) {
    const regex = /^https:\/\/picjoke\.org\/id\/effect\//;
    return regex.test(url);
  }
  getTitle(title) {
    return title.split("/").pop();
  }
  clnTitle(title) {
    return title.replace(/^\d+\s+/, "").replace(/\+/g, " ");
  }
  async init() {
    try {
      const html = await this.fetchHtml(this.url);
      const $ = cheerio.load(html);
      const formData = new FormData();
      ["anonuserId", "piclang", "clipart_id"].forEach(name => formData.append(name, $(`input[name="${name}"]`).val()));
      formData.append("MAX_FILE_SIZE", "52428000");
      const {
        ext = "jpg",
          mime = "image/jpg"
      } = await fileTypeFromBuffer(this.fileContent || Buffer.from([])) || {};
      formData.append("userfoto[]", new Blob([this.fileContent], {
        type: mime
      }), `image.${ext}`);
      const uploadHtml = await this.fetchHtml("https://n12.picjoke.org/generatepic.php");
      const $$ = cheerio.load(uploadHtml);
      const section = $$(".w3-center.w3-container");
      if (section.length) {
        const imgSrc = decodeURIComponent(section.find("img#resultpic").attr("src") || "").trim();
        const links = section.find("a").map((_, el) => decodeURIComponent($$(el).attr("href") || "").trim()).get().filter(href => !["https://picjoke.org/en/effect/", "//twitter.com/share"].includes(href));
        return {
          imgSrc: imgSrc,
          links: links
        };
      }
      return null;
    } catch (error) {
      console.error("Error initializing PicJoke:", error.message);
      return null;
    }
  }
  async search(query, page = 1) {
    try {
      const baseUrl = `https://picjoke.org/id/search/${query}`;
      const url = page > 1 ? `${baseUrl}/page/${page}` : baseUrl;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);
      return $(".w3-rest.w3-center.w3-padding a").map((_, el) => {
        const $el = $(el);
        const img = $el.find(".w3-card-8.w3-margin").first();
        const link = decodeURIComponent($el.attr("href") || "").trim();
        return {
          link: link ? new URL(link, baseUrl).href : null,
          imgSrc: img.attr("src") ? new URL(img.attr("src"), baseUrl).href : null
        };
      }).get().filter(({
        link
      }) => link && this.filterUrl(link));
    } catch (error) {
      console.error("Error searching:", error.message);
      return [];
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      input,
      index = 1,
      page = 1
    } = req.method === "GET" ? req.query : req.body;
    if (!input) {
      return res.status(400).json({
        error: "❌ Please provide a search query.\n\nUsage: /api/picjoke?input=<query>&index=<index>&page=<page>"
      });
    }
    const searchResults = await new PicJoke().search(input, parseInt(page, 10));
    const effectIndex = parseInt(index, 10);
    if (isNaN(effectIndex) || effectIndex < 1 || effectIndex > searchResults.length) {
      return res.status(400).json({
        error: `❌ Invalid index. Choose a valid index.\n\nAvailable options:\n${searchResults.map((result, i) => `*${i + 1}.* ${new PicJoke().clnTitle(new PicJoke().getTitle(result.link))}`).join("\n")}\n\nUsage: /api/picjoke?input=<query>&index=<index>&page=<page>`
      });
    }
    const selectedResult = searchResults[effectIndex - 1];
    const photoResult = await new PicJoke(selectedResult.link, req.body).init();
    if (photoResult?.imgSrc) {
      return res.status(200).json({
        imageUrl: photoResult.imgSrc,
        message: `Result for *${new PicJoke().clnTitle(new PicJoke().getTitle(selectedResult.link))}*`
      });
    }
    return res.status(500).json({
      error: "❌ Failed to generate image."
    });
  } catch (error) {
    console.error("Error handling API request:", error.message);
    return res.status(500).json({
      error: "❌ Internal Server Error."
    });
  }
}