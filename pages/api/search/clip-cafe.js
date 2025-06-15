import axios from "axios";
import * as cheerio from "cheerio";
class ClipCafeScraper {
  constructor(baseUrl = "https://clip.cafe") {
    this.baseUrl = baseUrl;
  }
  async fetchData(url) {
    try {
      const {
        data
      } = await axios.post(url);
      return data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }
  async search({
    query = "hulk",
    usersearch = "",
    onlyCaption = "",
    onlyTranscript = "",
    ss = "s",
    movieLimit = 5,
    clipLimit = 5
  }) {
    const encodedQuery = encodeURIComponent(query);
    const url = `${this.baseUrl}?s=${encodedQuery}&usersearch=${usersearch}&onlyCaption=${onlyCaption}&onlyTranscript=${onlyTranscript}&ss=${ss}`;
    const html = await this.fetchData(url);
    const $ = cheerio.load(html);
    const movieResults = $("main#main-cont .movie-row a").map((_, element) => ({
      title: $(element).find(".movieTitle").text() || "No Title",
      link: `${this.baseUrl}/${$(element).attr("href") || "No Link"}`,
      poster: `${this.baseUrl}/${$(element).find("img").attr("data-src") || "No Poster"}`
    })).get().slice(0, movieLimit);
    const clipResults = $(".searchResults .searchResultClip").map((_, element) => ({
      title: $(element).find(".clipMovie a").text() || "No Title",
      link: `${this.baseUrl}/${$(element).find(".clipMovie a").attr("href") || "No Link"}`,
      poster: $(element).find("img").attr("src") || "No Poster",
      transcript: $(element).find(".clipTrans p").text() || "No Transcript"
    })).get().slice(0, clipLimit);
    return {
      movies: movieResults,
      clips: clipResults
    };
  }
  async detail({
    url
  }) {
    const html = await this.fetchData(url);
    const $ = cheerio.load(html);
    const movieInfo = {
      title: $("h1").text().replace(/"(.+?)"/, "$1").trim(),
      poster: $(".moviePoster img").attr("src") || "No Poster",
      description: $(".movieDetail").first().text().trim(),
      director: $(".movieDetail").filter((_, el) => $(el).text().includes("Director:")).text().replace("Director:", "").trim() || "N/A",
      writer: $(".movieDetail").filter((_, el) => $(el).text().includes("Writer:")).text().replace("Writer:", "").trim() || "N/A",
      production: $(".movieDetail").filter((_, el) => $(el).text().includes("Production:")).text().replace("Production:", "").trim() || "N/A",
      genre: $(".movieDetail").filter((_, el) => $(el).text().includes("Genre:")).html().replace(/<a.*?>(.*?)<\/a>/g, "$1").trim() || "N/A",
      year: $(".movieDetail").filter((_, el) => $(el).text().includes("Year:")).text().replace("Year:", "").trim() || "N/A",
      metaScore: $(".movieDetail").filter((_, el) => $(el).text().includes("MetaScore:")).text().replace("MetaScore:", "").trim() || "N/A",
      imdbRating: $(".movieDetail").filter((_, el) => $(el).text().includes("ImdbRating:")).text().replace("ImdbRating:", "").trim() || "N/A",
      boxOffice: $(".movieDetail").filter((_, el) => $(el).text().includes("BoxOffice:")).text().replace("BoxOffice:", "").trim() || "N/A",
      released: $(".movieDetail").filter((_, el) => $(el).text().includes("Released:")).text().replace("Released:", "").trim() || "N/A",
      awards: $(".movieDetail").filter((_, el) => $(el).text().includes("Awards:")).text().replace("Awards:", "").trim() || "N/A",
      similarMovies: $(".movieDetail").filter((_, el) => $(el).text().includes("Also watch:")).html().replace(/<a.*?>(.*?)<\/a>/g, "$1").trim() || "N/A"
    };
    const clips = $(".movieClips .smallClipContainer").map((_, element) => ({
      title: $(element).find(".clipTitle").text() || "No Title",
      link: `${this.baseUrl}/${$(element).attr("href") || "No Link "}`,
      poster: $(element).find("img").attr("data-src") || "No Poster"
    })).get();
    return {
      movieInfo: movieInfo,
      clips: clips
    };
  }
  async download({
    url
  }) {
    const html = await this.fetchData(url);
    const $ = cheerio.load(html);
    const videoInfo = {
      title: $(".quote-title").text().trim() || "No Title",
      videoUrl: $("video source").attr("src") || "No Video URL",
      poster: $("#moviePoster img").attr("src") || "No Poster",
      description: $(".above-video").find("h1").text().trim() || "No Description",
      shareLink: url
    };
    return videoInfo;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...body
  } = req.method === "POST" ? req.body : req.query;
  const api = new ClipCafeScraper();
  try {
    let result;
    switch (action) {
      case "search":
        result = await api.search(body);
        break;
      case "detail":
        result = await api.detail(body);
        break;
      case "download":
        result = await api.download(body);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}