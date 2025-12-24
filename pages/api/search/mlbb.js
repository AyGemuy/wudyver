import axios from "axios";
class MLBBAPI {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }
  async fetchHeroes(offset = 0, limit = 10) {
    try {
      const response = await axios.get(`${this.baseURL}/heroes`, {
        params: {
          offset: offset,
          limit: limit
        }
      });
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch heroes");
    }
  }
  async fetchHeroByName(name) {
    try {
      const response = await axios.get(`${this.baseURL}/heroes/${name}`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch hero by name");
    }
  }
  async fetchHeroById(id) {
    try {
      const response = await axios.get(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch hero by ID");
    }
  }
  async fetchHeroesByRole(role) {
    try {
      const response = await axios.get(`${this.baseURL}/roles/${role}`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch heroes by role");
    }
  }
}
export default async function handler(req, res) {
  const {
    query,
    method
  } = req;
  const {
    offset = 0,
      limit = 10,
      name,
      id,
      role
  } = query;
  const mlbbAPI = new MLBBAPI("https://mlbb-api.vercel.app");
  try {
    const result = name ? await mlbbAPI.fetchHeroByName(name) : id ? await mlbbAPI.fetchHeroById(id) : role ? await mlbbAPI.fetchHeroesByRole(role) : await mlbbAPI.fetchHeroes(offset, limit);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      result: null,
      error: error.message
    });
  }
}