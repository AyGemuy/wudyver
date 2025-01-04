import axios from "axios";
import * as cheerio from "cheerio";
const proxyUrls = ["https://thingproxy.freeboard.io/fetch/", "https://cors.newfrontdoor.org/api/cors?url=", "https://api.allorigins.win/raw?url="];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
class EromeAPI {
  constructor() {
    this.axiosInstance = axios.create();
  }
  async search(query) {
    const url = randomProxyUrl + `https://www.erome.com/search?q=${encodeURIComponent(query)}`;
    try {
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const albums = [];
      $(".album").each((i, element) => {
        const album = {
          title: $(element).find(".album-title").text().trim(),
          link: $(element).find(".album-title").attr("href"),
          user: $(element).find(".album-user").text().trim(),
          thumbnail: $(element).find(".album-thumbnail").data("src"),
          views: $(element).find(".album-bottom-views").text().trim()
        };
        albums.push(album);
      });
      if (albums.length === 0) {
        return {
          message: "No albums found for the query"
        };
      }
      return albums;
    } catch (error) {
      console.error("Error fetching search results:", error);
      return {
        message: "Error fetching search results. Please try again later."
      };
    }
  }
  async detail(url) {
    try {
      const refererUrl = "https://www.erome.com";
      const response = await this.axiosInstance.get(randomProxyUrl + url, {
        headers: {
          Referer: refererUrl
        }
      });
      const $ = cheerio.load(response.data);
      const albumDetails = {
        title: $("h1").text().trim(),
        username: $("#user_name").text().trim(),
        userProfileImage: $("#user_icon img").attr("src"),
        userProfileLink: $("#user_name").attr("href"),
        videoCount: $(".album-videos").text().trim(),
        views: $(".fa-eye").parent().text().trim(),
        likes: $(".fa-heart").next("b").text().trim(),
        reposts: $(".album-repost b").text().trim(),
        videoUrl: $("video source").attr("src"),
        tags: [],
        mediaSize: 0
      };
      $("p.mt-10 a").each((i, tag) => {
        albumDetails.tags.push($(tag).text().trim());
      });
      if (!albumDetails.title) {
        return {
          message: "Album details could not be fetched. Please check the URL."
        };
      }
      return albumDetails;
    } catch (error) {
      console.error("Error fetching album details:", error);
      return {
        message: "Error fetching album details. Please try again later."
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const api = new EromeAPI();
  if (action === "search" && query) {
    const result = await api.search(query);
    return res.status(200).json({
      result: result
    });
  } else if (action === "detail" && url) {
    const result = await api.detail(url);
    return res.status(200).json({
      result: result
    });
  } else {
    if (!action) {
      return res.status(400).json({
        message: 'Parameter "action" tidak ditemukan. Harap masukkan "search" atau "detail".'
      });
    } else if (action === "search" && !query) {
      return res.status(400).json({
        message: 'Parameter "query" diperlukan untuk pencarian. Harap masukkan kata kunci pencarian.'
      });
    } else if (action === "detail" && !url) {
      return res.status(400).json({
        message: 'Parameter "url" diperlukan untuk detail. Harap masukkan URL yang valid.'
      });
    } else {
      return res.status(400).json({
        message: "Aksi yang tidak valid atau parameter yang hilang."
      });
    }
  }
}