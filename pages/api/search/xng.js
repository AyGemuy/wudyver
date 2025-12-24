import axios from "axios";
class SearxNG {
  constructor(searxngInstanceUrl = "") {
    this.searxngInstanceUrl = searxngInstanceUrl;
    this.searxngEndpoint = "";
    this.commands = {
      "Use The Search Engine": this.search.bind(this)
    };
    this.initServer();
  }
  async initServer() {
    if (!this.searxngInstanceUrl) {
      try {
        const response = await axios.get("https://searx.space/data/instances.json");
        const servers = Object.keys(response.data.instances);
        const randomIndex = Math.floor(Math.random() * servers.length);
        this.searxngInstanceUrl = servers[randomIndex];
      } catch {
        this.searxngInstanceUrl = "https://search.us.projectsegfau.lt";
      }
    }
    const server = this.searxngInstanceUrl.replace(/\/$/, "");
    this.searxngEndpoint = `${server}/search`;
  }
  async search(query) {
    try {
      const response = await axios.get(this.searxngEndpoint, {
        params: {
          q: query,
          language: "en",
          safesearch: 1,
          format: "json"
        }
      });
      const results = response.data.results.map(result => `${result.title} - ${result.url}`);
      return results;
    } catch {
      this.searxngEndpoint = "https://search.us.projectsegfau.lt/search";
      return this.search(query);
    }
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Missing required parameter: query"
    });
  }
  const searx = new SearxNG();
  try {
    const results = await searx.search(query);
    return res.status(200).json({
      results: results
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      error: "Failed to fetch search results"
    });
  }
}