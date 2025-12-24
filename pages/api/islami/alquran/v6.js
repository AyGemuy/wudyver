import axios from "axios";
class QuranAPI {
  constructor() {
    this.api = axios.create({
      headers: {
        "User-Agent": "QuranAPI/1.0",
        Accept: "application/json"
      }
    });
  }
  async getAyat({
    surah,
    ayat
  }) {
    try {
      const response = await this.api.get("https://mp3quran.net/id/ajax/soar/item", {
        params: {
          r: surah,
          s: ayat
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching Quran data:", error.response?.data || error.message);
      return null;
    }
  }
  async getList() {
    try {
      const response = await this.api.get("https://mp3quran.net/id/ajax/soar/list");
      return response.data;
    } catch (error) {
      console.error("Error fetching Quran list:", error.response?.data || error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    const quran = new QuranAPI();
    let response;
    switch (action) {
      case "surah":
        response = await quran.getAyat(params);
        break;
      case "list":
        response = await quran.getList();
        break;
      default:
        throw {
          status: false,
            code: 400,
            result: {
              message: "Aksi tidak ditemukan. Gunakan action yang valid."
            }
        };
    }
    return res.status(200).json(response);
  } catch (error) {
    return res.status(error.code || 500).json(error);
  }
}