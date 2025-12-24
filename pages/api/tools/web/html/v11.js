import axios from "axios";
class FireCrawl {
  constructor() {
    this.url = "https://api.firecrawl.dev/v1/scrape";
    this.client = axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        authorization: "Bearer this_is_just_a_preview_token",
        "content-type": "application/json",
        origin: "https://www.firecrawl.dev",
        priority: "u=1, i",
        referer: "https://www.firecrawl.dev/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async scrape(url) {
    try {
      const data = {
        url: url,
        formats: ["html"],
        onlyMainContent: false,
        excludeTags: [""],
        includeTags: [""],
        origin: "website-preview"
      };
      const response = await this.client.post(this.url, data);
      const {
        data: {
          html
        }
      } = response.data;
      return html;
    } catch (error) {
      console.error("Error fetching data:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).send("URL is required");
  }
  try {
    const fetcher = new FireCrawl();
    const result = await fetcher.scrape(url);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
}