import axios from "axios";
class CountryService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: "https://restfulcountries.com/api/v1",
      headers: {
        Authorization: "Bearer 552|U4oLHdXZ1Kf5vbgEVT0bGzRJejrlgsjmKgF1g94X"
      }
    });
  }
  async getAllCountries(perPage = 10) {
    try {
      const response = await this.apiClient.get(`/countries?per_page=${perPage}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch countries");
    }
  }
  async getCountryByName(name) {
    try {
      const response = await this.apiClient.get(`/countries/${name}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Country not found");
    }
  }
  async getCountriesByContinent(continent) {
    try {
      const response = await this.apiClient.get(`/countries?continent=${continent}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch countries by continent");
    }
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const queryOrBody = method === "GET" ? req.query : req.body;
  const {
    per_page,
    name,
    continent
  } = queryOrBody;
  const countryService = new CountryService();
  try {
    switch (method) {
      case "GET":
      case "POST":
        if (name) {
          const country = await countryService.getCountryByName(name);
          return res.status(200).json(country);
        }
        if (continent) {
          const countries = await countryService.getCountriesByContinent(continent);
          return res.status(200).json(countries);
        }
        const countries = await countryService.getAllCountries(per_page || 10);
        return res.status(200).json(countries);
      default:
        return res.status(405).json({
          message: "Method not allowed"
        });
    }
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal Server Error"
    });
  }
}