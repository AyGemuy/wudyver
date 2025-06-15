import axios from "axios";
class LaheluAPI {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "https://lahelu.com/api/post",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      }
    });
  }
  async search({
    query = "miku",
    page = 1,
    ...otherParams
  } = {}) {
    try {
      const searchParams = new URLSearchParams({
        query: query,
        page: page,
        ...otherParams
      });
      const response = await this.axiosInstance.get(`/get-search?${searchParams.toString()}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error("Error searching Lahelu (response):", error.response.data);
      } else if (error.request) {
        console.error("Error searching Lahelu (request):", error.request);
      } else {
        console.error("Error searching Lahelu (general):", error.message);
      }
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "query are required"
    });
  }
  try {
    const api = new LaheluAPI();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}