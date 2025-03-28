import axios from "axios";
class WhatOnEarthSearch {
  constructor() {
    this.baseURL = "https://www.whatonearth.ai/search";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.whatonearth.ai/?via=topaitools"
    };
  }
  async search(query = "Tiktok", offline = true, web = "") {
    try {
      const {
        data
      } = await axios.post(this.baseURL, {
        search: query,
        offline: offline,
        web: web
      }, {
        headers: this.headers
      });
      console.log("[WhatOnEarthSearch] Response:", data);
      return data;
    } catch (error) {
      console.error("[WhatOnEarthSearch] Error:", error.message);
      throw new Error(error.response?.data || "Internal Server Error");
    }
  }
}
export default async function handler(req, res) {
  const {
    query,
    offline = true,
    web = ""
  } = req.method === "GET" ? req.query : req.body;
  if (!query) return res.status(400).json({
    error: "Query is required"
  });
  try {
    const searchAPI = new WhatOnEarthSearch();
    const result = await searchAPI.search(query, offline, web);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}