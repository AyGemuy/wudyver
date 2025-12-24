import axios from "axios";
class BlackHole {
  constructor() {
    this.baseUrl = "https://main.api.progmore.com";
  }
  async download({
    url,
    ...rest
  }) {
    if (!url) throw new Error("URL required!");
    console.log("Starting download...", {
      url: url,
      ...rest
    });
    try {
      const targetUrl = `${this.baseUrl}/?url=${encodeURIComponent(url)}`;
      console.log("Fetching from:", targetUrl);
      const response = await axios.get(targetUrl, {
        timeout: 3e4,
        ...rest
      });
      const result = response?.data || {};
      console.log("Download completed:", result?.status || "Success");
      return result;
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Unknown error occurred";
      console.error("Download failed:", errorMessage);
      throw new Error(`Download error: ${errorMessage}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const downloader = new BlackHole();
    const response = await downloader.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}