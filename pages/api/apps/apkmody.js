import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class ApkMody {
  constructor() {
    this.proxy_base_url = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v8?url=`;
    this.base_url = "https://apkmody.com/";
  }
  async search({
    query,
    limit = 5,
    ...rest
  }) {
    if (!query) throw new Error("Query parameter is required.");
    try {
      const target_url = `${this.base_url}search/${encodeURIComponent(query)}`;
      const proxy_url = `${this.proxy_base_url}${encodeURIComponent(target_url)}`;
      const {
        data: html
      } = await axios.get(proxy_url);
      const $ = cheerio.load(html);
      return $("article.flex-item").get().map(el => {
        const app_link = $(el).find("a.app.clickable");
        const sub_text_el = app_link.find(".app-sub-text").clone();
        const genre = sub_text_el.find(".app-genre").text()?.trim().replace(/•\s*/, "") ?? "N/A";
        sub_text_el.find(".app-genre").remove();
        const sub_text = sub_text_el.text()?.trim().replace(/\s+/g, " ") ?? "N/A";
        return {
          title: app_link.find("h2").text()?.trim() ?? "N/A",
          url: app_link.attr("href") ?? "N/A",
          icon: app_link.find(".app-icon img").attr("src") ?? "N/A",
          sub_text: sub_text,
          genre: genre
        };
      }).slice(0, limit);
    } catch (error) {
      console.error("Error in search:", error.message);
      return [];
    }
  }
  async detail({
    url
  }) {
    if (!url) throw new Error("URL parameter is required.");
    try {
      const proxy_url = `${this.proxy_base_url}${encodeURIComponent(url)}`;
      const {
        data: html
      } = await axios.get(proxy_url);
      const $ = cheerio.load(html);
      const details = {};
      $("#app-info table tbody tr").each((em, el) => {
        const key = $(el).find("th").text()?.trim();
        let value = $(el).find("td").text()?.trim();
        if (key === "Google Play ID") value = $(el).find("td a").attr("href") ?? value;
        else if (key === "Category") value = $(el).find("td a").text()?.trim() ?? value;
        else if (key === "MOD Features") value = $(el).find("td a").text()?.trim() ?? value;
        else if (key === "Updated On") value = $(el).find("td time").attr("datetime") ?? value;
        if (key) details[key.toLowerCase().replace(/\s(.)/g, (m, g) => g.toUpperCase())] = value;
      });
      const meta_tags = {};
      $("head meta").each((em, el) => {
        const key = $(el).attr("name") || $(el).attr("property");
        if (key) {
          meta_tags[key.replace(/:/g, "_")] = $(el).attr("content");
        }
      });
      const description = $(".entry-block.entry-content p").get().map(el => $(el).text().trim()).join("\n\n") ?? "N/A";
      const downloads = $(".download-list a").get().map(el => ({
        name: $(el).find(".download-item-name .color__blue").text()?.trim() ?? "N/A",
        url: $(el).attr("href") ?? "N/A",
        tags: $(el).find(".download-item-name .app-tag").get().map(tag_el => $(tag_el).text().trim())
      }));
      const author_block = $(".entry-author");
      const author = {
        name: author_block.find("strong").text()?.trim() ?? "N/A",
        url: author_block.attr("href") ?? "N/A",
        avatar: author_block.find("img").attr("src") ?? "N/A"
      };
      return {
        ...details,
        meta_tags: meta_tags,
        description: description,
        downloads: downloads,
        author: author
      };
    } catch (error) {
      console.error("Error in detail:", error.message);
      return {};
    }
  }
  async download({
    url
  }) {
    if (!url) throw new Error("URL parameter is required.");
    try {
      const proxy_url = `${this.proxy_base_url}${encodeURIComponent(url)}`;
      const {
        data: html
      } = await axios.get(proxy_url);
      const $ = cheerio.load(html);
      const meta_tags = {};
      $("head meta").each((em, el) => {
        const key = $(el).attr("name") || $(el).attr("property");
        if (key) {
          meta_tags[key.replace(/:/g, "_")] = $(el).attr("content");
        }
      });
      const download_button = $("#d-button");
      const file_string = $(".entry-content span.truncate").text()?.trim();
      const match = file_string?.match(/^(.*?)_v(.+)\.(apk|xapk)$/i);
      return {
        title: $(".entry-content h1").text()?.trim() ?? "N/A",
        version: match?.[2] ?? "N/A",
        icon: $(".app-icon img").attr("src") ?? "N/A",
        file: file_string ?? "N/A",
        download_url: download_button.attr("href") ?? "N/A",
        meta_tags: meta_tags
      };
    } catch (error) {
      console.error("Error in download:", error.message);
      return {};
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "search | detail | download"
      }
    });
  }
  const scraper = new ApkMody();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await scraper[action](params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await scraper[action](params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await scraper[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | detail | download`
        });
    }
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    console.error(`Processing error for action "${action}":`, error);
    return res.status(500).json({
      success: false,
      error: `Processing error: ${error.message}`
    });
  }
}