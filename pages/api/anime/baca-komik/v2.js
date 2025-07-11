import axios from "axios";
class BacaKomikAPI {
  constructor() {
    this.baseUrl = "https://bacakomik-gilt.vercel.app/api";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://bacakomik-gilt.vercel.app/"
    };
  }
  async getPopularComics() {
    try {
      const response = await axios.get(`${this.baseUrl}/comics/popular`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch popular comics");
    }
  }
  async getAllComics() {
    try {
      const response = await axios.get(`${this.baseUrl}/comics`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch all comics");
    }
  }
  async getComicUpdates() {
    try {
      const response = await axios.get(`${this.baseUrl}/comics/update`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch comic updates");
    }
  }
  async searchComics(queryParams) {
    try {
      const {
        title = "",
          author = "",
          year = "",
          status = "",
          order = "title",
          type = "",
          genre = ""
      } = queryParams;
      const response = await axios.get(`${this.baseUrl}/comics`, {
        params: {
          multiple_search: true,
          title: title,
          author: author,
          year: year,
          status: status,
          order: order,
          type: type,
          genre: genre
        },
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch comic search results");
    }
  }
  async getMangaDetails(mangaId) {
    try {
      const response = await axios.get(`${this.baseUrl}/details/manga/${mangaId}`, {
        headers: {
          ...this.headers,
          Referer: `https://bacakomik-gilt.vercel.app/details/manga/${mangaId}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch manga details");
    }
  }
}
export default async function handler(req, res) {
  const bacaKomikAPI = new BacaKomikAPI();
  const {
    method
  } = req;
  const queryParams = req.method === "GET" ? req.query : req.body;
  const {
    action,
    mangaId,
    title,
    author,
    genre
  } = queryParams;
  try {
    switch (action) {
      case "popular":
        const popularComics = await bacaKomikAPI.getPopularComics();
        return res.status(200).json(popularComics);
      case "all":
        const allComics = title || author || genre ? await bacaKomikAPI.searchComics(queryParams) : await bacaKomikAPI.getAllComics();
        return res.status(200).json(allComics);
      case "update":
        const comicUpdates = await bacaKomikAPI.getComicUpdates();
        return res.status(200).json(comicUpdates);
      case "search":
        const searchResults = await bacaKomikAPI.searchComics(queryParams);
        return res.status(200).json(searchResults);
      case "details":
        if (mangaId) {
          const mangaDetails = await bacaKomikAPI.getMangaDetails(mangaId);
          return res.status(200).json(mangaDetails);
        } else {
          return res.status(400).json({
            error: "Manga ID is required for details"
          });
        }
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}