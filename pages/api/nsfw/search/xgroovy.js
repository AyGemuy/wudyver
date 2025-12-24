import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
class XGroovy {
  constructor() {
    this.baseUrl = "https://xgroovy.com";
  }
  async search(query = "") {
    if (!query) return {
      result: "Query cannot be empty"
    };
    try {
      const {
        data
      } = await axios.get(randomProxyUrl + encodeURIComponent(`${this.baseUrl}/search/${encodeURIComponent(query)}/`));
      const $ = cheerio.load(data);
      return {
        result: $("#list_videos_custom_videos_search_result_items .item").map((_, el) => ({
          id: $(el).data("video-id") || "Unknown",
          title: $(el).find("strong.title").text().trim() || "No Title",
          url: $(el).find("a.popito").attr("href") || "No URL",
          thumb: $(el).find(".img img.thumb").attr("src") || "No Thumbnail",
          preview: $(el).find(".img img.thumb").data("preview") || "No Preview",
          views: $(el).data("views") || "0",
          rating: `${$(el).data("rating") || "0"}%`,
          duration: $(el).find(".wrap .duration").text().trim() || "Unknown",
          quality: $(el).find(".item-quality span.is-hd").text().trim() || "Unknown"
        })).get() || "No results found"
      };
    } catch {
      return {
        result: "Failed to fetch search data"
      };
    }
  }
  async detail(url = "") {
    if (!url) return {
      result: "URL cannot be empty"
    };
    try {
      const {
        data
      } = await axios.get(randomProxyUrl + encodeURIComponent(url));
      const $ = cheerio.load(data);
      return {
        result: {
          title: $(".page-title h1").text().trim() || "Unknown",
          duration: $(".badge.duration").text().trim() || "Unknown",
          quality: $(".badge.quality").text().trim() || "Unknown",
          fps: $(".badge.fps").text().trim() || "Unknown",
          views: $(".badge.views").text().trim() || "0",
          tags: $(".meta-data .default-list li a").map((_, el) => $(el).text().trim()).get(),
          videoLinks: $("#main_video source").map((_, el) => ({
            resolution: $(el).attr("title"),
            src: $(el).attr("src")
          })).get()
        }
      };
    } catch {
      return {
        result: "Failed to fetch detail data"
      };
    }
  }
  async photoai() {
    try {
      const {
        data
      } = await axios.get(randomProxyUrl + encodeURIComponent(`${this.baseUrl}/photos/categories/ai/`));
      const $ = cheerio.load(data);
      return {
        result: $(".box .list-albums .item").map((_, el) => ({
          id: $(el).data("album-id"),
          title: $(el).find(".title").text().trim() || "No Title",
          link: $(el).find("a").attr("href"),
          imageUrls: $(el).find(".swiper-slide img").map((_, img) => $(img).attr("src")).get()
        })).get()
      };
    } catch {
      return {
        result: "Error fetching AI photos"
      };
    }
  }
  async photo() {
    try {
      const {
        data
      } = await axios.get(randomProxyUrl + encodeURIComponent(`${this.baseUrl}/photos/`));
      const $ = cheerio.load(data);
      return {
        result: $("#list_albums_custom_albums_items .item").map((_, el) => ({
          albumId: $(el).data("album-id") || "Unknown",
          title: $(el).find("strong.title").text().trim() || "No Title",
          url: $(el).find("a").attr("href") || "No URL",
          thumb: $(el).find(".img img.thumb").attr("src") || "No Thumbnail",
          tags: $(el).find(".added_to a").map((_, tag) => $(tag).text().trim()).get(),
          likes: $(el).find(".ajax-comment-rate .badget").text().trim() || "0",
          comments: $(el).find('.tool-item.tippy[data-tip="Comments"] .badget').text().trim() || "0"
        })).get() || "No albums found"
      };
    } catch {
      return {
        result: "Failed to fetch photo albums"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    method,
    query
  } = req;
  const {
    action = "search",
      query: searchQuery = "furry",
      url
  } = query;
  const xGroovy = new XGroovy();
  if (method === "GET") {
    const actions = {
      search: () => xGroovy.search(searchQuery),
      detail: () => xGroovy.detail(url),
      photoai: () => xGroovy.photoai(),
      photo: () => xGroovy.photo()
    };
    const actionResult = actions[action] ? await actions[action]() : {
      result: "Invalid action"
    };
    return res.status(200).json(actionResult);
  } else {
    return res.status(405).json({
      result: "Method Not Allowed"
    });
  }
}