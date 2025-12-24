import axios from "axios";
class ProfileFetcher {
  constructor(username, channel = "INSTAGRAM") {
    this.url = `https://fkwdo6tceerhxqtv5fhokkoxmi0lgpva.lambda-url.eu-central-1.on.aws/?operation=get-profile&username=${encodeURIComponent(username)}&channel=${channel}`;
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      Connection: "keep-alive",
      Origin: "https://www.modash.io",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async fetchProfile() {
    try {
      const response = await axios.get(this.url, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching profile:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    query,
    channel
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      message: "query is required."
    });
  }
  const fetcher = new ProfileFetcher(query, channel);
  try {
    const result = await fetcher.fetchProfile();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch data",
      details: error.message
    });
  }
}