import axios from "axios";
import * as cheerio from "cheerio";
class AnimeScraper {
  constructor(baseURL = `https://${process.env.DOMAIN_URL}/api/tools/web/html/v1?url=https://kuramanime.pro`) {
    this.baseURL = baseURL;
  }
  async searchAnime(query) {
    try {
      const response = await axios.get(`${this.baseURL}/anime?search=${encodeURIComponent(query)}&order_by=oldest`);
      const $ = cheerio.load(response.data);
      const searchResults = [];
      $("#animeList .product__sidebar__view__item").each((_, element) => {
        const animeTitle = $(element).find("h5.sidebar-title-h5").text().trim();
        const animeLink = $(element).find("a").attr("href");
        const animeImage = $(element).find("div.set-bg").data("setbg");
        const animeRating = $(element).find(".ep .actual-anime").text().trim();
        searchResults.push({
          title: animeTitle,
          link: animeLink,
          image: animeImage,
          rating: animeRating
        });
      });
      return {
        status: "success",
        data: searchResults
      };
    } catch (error) {
      console.log("Error fetching ongoing anime data:", error);
      return {
        status: "error",
        message: "Failed to fetch data"
      };
    }
  }
  async detailAnime(url) {
    try {
      const response = await axios.get(`${url}`);
      const $ = cheerio.load(response.data);
      const animeDetails = {
        title: $("h3").text(),
        synopsis: $("#synopsisField").text(),
        rating: $(".fa-star").next().text(),
        episodes: $('li:contains("Episode:") a').text(),
        status: $('li:contains("Status:") a').text(),
        genres: [],
        studio: $('li:contains("Studio:") a').text(),
        score: $('li:contains("Skor:") a').text(),
        members: $('li:contains("Peminat:") a').text(),
        follow: {
          url: $("#followButton").attr("href"),
          text: $("#followButton").text().trim()
        },
        episodesList: [],
        batchList: []
      };
      $('li:contains("Genre:") a').each((i, elem) => {
        animeDetails.genres.push($(elem).text());
      });
      $("#episodeListsSection a").each((i, elem) => {
        animeDetails.episodesList.push({
          episode: $(elem).text().trim(),
          url: $(elem).attr("href")
        });
      });
      $("#episodeBatchListsSection a").each((i, elem) => {
        animeDetails.batchList.push({
          batch: $(elem).text().trim(),
          url: $(elem).attr("href")
        });
      });
      return {
        status: "success",
        data: animeDetails
      };
    } catch (error) {
      console.log("Error fetching ongoing anime data:", error);
      return {
        status: "error",
        message: "Failed to fetch data"
      };
    }
  }
  async getOngoingAnime(orderBy = "latest", page = 1) {
    try {
      const response = await axios.get(`${this.baseURL}/anime/ongoing?order_by=${orderBy}&page=${page}`);
      const $ = cheerio.load(response.data);
      const element = $("#animeList > div > div");
      let datas = [];
      element.each((i, e) => {
        datas.push({
          title: $(e).find("div > h5 > a").text(),
          episodeId: $(e).find("div > h5 > a").attr("href") ? $(e).find("div > h5 > a").attr("href").replace(this.baseURL, "") : "",
          image: $(e).find("a > div").attr("data-setbg"),
          episode: $(e).find(" a > div > div.ep > span").text().replace(/\s+/g, " ").trim()
        });
      });
      return {
        status: "success",
        statusCode: 200,
        page: page,
        order_by: orderBy,
        data: datas
      };
    } catch (error) {
      console.log("Error fetching ongoing anime data:", error);
      return {
        status: "error",
        message: "Failed to fetch data"
      };
    }
  }
  async getScheduleAnime(scheduledDay = "all", page = 1) {
    try {
      const response = await axios.get(`${this.baseURL}/schedule?scheduled_day=${scheduledDay}&page=${page}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/531.21.10 (KHTML, like Gecko) Chrome/79.0.3945.136 Mobile Safari/537.36"
        }
      });
      const $ = cheerio.load(response.data);
      const element = $("#animeList > div > div");
      let datas = [];
      element.each((i, e) => {
        datas.push({
          title: $(e).find("div > h5 > a").text(),
          image: $(e).find("a > div").attr("data-setbg"),
          animeId: $(e).find("div > h5 > a").attr("href") ? $(e).find("div > h5 > a").attr("href").replace(this.baseURL, "") : "",
          days: $(e).find("a > div > div.view-end > ul > li:nth-child(1) > span").text().replace(/\s+/g, " "),
          timeRelease: $(e).find("a > div > div.view-end > ul > li:nth-child(2) > span").text().replace(/\s+/g, " "),
          episode: $(e).find("  a > div > div.ep > span:nth-child(2)").text().replace(/Ep\s*\n\s*/, "Ep ").trim(),
          typeList: {
            type1: $(e).find(" div > div > ul > a:first-child").text(),
            type2: $(e).find(" div > div > ul > a:last-child").text()
          }
        });
      });
      return {
        status: "success",
        statusCode: 200,
        page: page,
        scheduled_day: scheduledDay,
        data: datas
      };
    } catch (error) {
      console.log("Error fetching schedule anime data:", error);
      return {
        status: "error",
        message: "Failed to fetch data"
      };
    }
  }
  async getPropertiesAnime(genreType = "genre") {
    try {
      const response = await axios.get(`${this.baseURL}/properties/genre?genre_type=${genreType}&page=1`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/531.21.10 (KHTML, like Gecko) Chrome/79.0.3945.136 Mobile Safari/537.36"
        }
      });
      const $ = cheerio.load(response.data);
      const element = $("#animeList > div > div > ul > li");
      let datas = [];
      element.each((i, e) => {
        datas.push({
          genreName: $(e).find(" a > span").text(),
          genreId: $(e).find(" a > span").text().toLowerCase().replace(/\s+/g, "-")
        });
      });
      return {
        status: "success",
        statusCode: 200,
        properties: genreType,
        data: datas
      };
    } catch (error) {
      console.log("Error fetching properties anime data:", error);
      return {
        status: "error",
        message: "Failed to fetch data"
      };
    }
  }
  async getPropertiesGenre(genreName, orderBy = "ascending", page = 1) {
    try {
      const response = await axios.get(`${this.baseURL}/properties/genre/${genreName}?order_by=${orderBy}&page=${page}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/531.21.10 (KHTML, like Gecko) Chrome/79.0.3945.136 Mobile Safari/537.36"
        }
      });
      const $ = cheerio.load(response.data);
      const element = $("#animeList > div > div");
      let datas = [];
      element.each((i, e) => {
        datas.push({
          title: $(e).find("div > h5 > a").text(),
          image: $(e).find("a > div").attr("data-setbg"),
          animeId: $(e).find("div > h5 > a").attr("href") ? $(e).find("div > h5 > a").attr("href").replace(this.baseURL, "") : "",
          ratings: $(e).find(" a > div > div.ep > span").text().replace(/\s+/g, " ").trim()
        });
      });
      return {
        status: "success",
        statusCode: 200,
        genreName: genreName,
        data: datas
      };
    } catch (error) {
      console.log("Error fetching properties genre data:", error);
      return {
        status: "error",
        message: "Failed to fetch data"
      };
    }
  }
  async getDetailsAnime(animeId, animeIdTitle) {
    try {
      const response = await axios.get(`${this.baseURL}/anime/${animeId}/${animeIdTitle}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/531.21.10 (KHTML, like Gecko) Chrome/79.0.3945.136 Mobile Safari/537.36"
        }
      });
      const $ = cheerio.load(response.data);
      const element = $("body > section > div > div.anime__details__content > div");
      let datas = [];
      const viewer = $("body > section > div > div.anime__details__content > div > div.col-lg-3 > div > div.view-end > ul > li:nth-child(2) > span").text();
      let episode = $("#episodeLists").attr("data-content");
      const $$ = cheerio.load(episode);
      let episodeArray = [];
      $$("a").each((i, e) => {
        const eps = $(e).attr("href").trim().replace(this.baseURL, "");
        const epsTitle = $(e).text().replace(/\s+/g, " ");
        episodeArray.push({
          episodeId: eps,
          epsTitle: epsTitle
        });
      });
      element.each((i, e) => {
        datas.push({
          type: $(e).find(" div.col-lg-9 > div > div.anime__details__widget > div > div:nth-child(1) > ul > li:nth-child(1) > a").text(),
          title: $(e).find(" div.col-lg-9 > div > div.anime__details__title > h3").text(),
          englishTitle: $(e).find("div.col-lg-9 > div > div.anime__details__title > span").text(),
          synopsis: $(e).find("#synopsisField").text(),
          status: $(e).find(" div.col-lg-9 > div > div.anime__details__widget > div > div:nth-child(1) > ul > li:nth-child(3) > a").text(),
          image: $(e).find(" div.col-lg-3 > div").attr("data-setbg"),
          ratings: $(e).find(" div.col-lg-3 > div > div.ep").text().replace(/\s+/g, " "),
          animeQuality: $(e).find(" div.col-lg-3 > div > div.ep-v2").text(),
          totalEps: $(e).find("div.col-lg-9 > div > div.anime__details__widget > div > div:nth-child(1) > ul > li:nth-child(4) > span").text(),
          videoLink: $(e).find("div > div.anime__details__watch > div > div > ul > li:nth-child(1) > a").attr("href")
        });
      });
      return {
        status: "success",
        statusCode: 200,
        animeId: animeId,
        title: animeIdTitle,
        data: datas,
        episodes: episodeArray,
        viewers: viewer
      };
    } catch (error) {
      console.log("Error fetching anime details data:", error);
      return {
        status: "error",
        message: "Failed to fetch data"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url,
    order_by,
    page,
    genre_type,
    scheduled_day,
    genre_name,
    anime_id,
    anime_id_title
  } = req.query;
  const animeScraper = new AnimeScraper();
  try {
    switch (action) {
      case "ongoing":
        const ongoingAnime = await animeScraper.getOngoingAnime(order_by, page);
        return res.status(200).json(ongoingAnime);
      case "search":
        const searchAnime = await animeScraper.searchAnime(query);
        return res.status(200).json(searchAnime);
      case "detail":
        const detailAnime = await animeScraper.detailAnime(url);
        return res.status(200).json(detailAnime);
      case "schedule":
        const scheduleAnime = await animeScraper.getScheduleAnime(scheduled_day, page);
        return res.status(200).json(scheduleAnime);
      case "properties":
        const propertiesAnime = await animeScraper.getPropertiesAnime(genre_type);
        return res.status(200).json(propertiesAnime);
      case "genre":
        if (!genre_name) {
          return res.status(400).json({
            status: "error",
            message: "Genre name is required"
          });
        }
        const genreAnime = await animeScraper.getPropertiesGenre(genre_name, order_by, page);
        return res.status(200).json(genreAnime);
      case "details":
        if (!anime_id || !anime_id_title) {
          return res.status(400).json({
            status: "error",
            message: "Anime ID and Title are required"
          });
        }
        const animeDetails = await animeScraper.getDetailsAnime(anime_id, anime_id_title);
        return res.status(200).json(animeDetails);
      default:
        return res.status(400).json({
          status: "error",
          message: "Invalid action"
        });
    }
  } catch (error) {
    console.error("Error handling API request:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error"
    });
  }
}