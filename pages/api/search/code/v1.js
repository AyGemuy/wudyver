import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class GitHubSearch {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://github.com/search",
      headers: {
        accept: "application/json",
        "accept-language": "id-ID,id;q=0.9",
        priority: "u=1, i",
        referer: "https://github.com/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "x-github-target": "dotcom",
        "x-react-router": "json",
        "x-requested-with": "XMLHttpRequest"
      },
      jar: this.cookieJar
    }));
  }
  async search(params) {
    try {
      const response = await this.client.get("", {
        params: {
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching search results:", error);
      throw new Error("Failed to fetch GitHub search results");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: 'Paramenter "query" diperlukan'
    });
  }
  const githubSearch = new GitHubSearch();
  try {
    const result = await githubSearch.search(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}