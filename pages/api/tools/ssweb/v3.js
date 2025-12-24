import axios from "axios";
class ScreenshotCreator {
  constructor() {
    this.baseUrl = "https://gcp.imagy.app/screenshot/createscreenshot";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36",
      Referer: "https://imagy.app/full-page-screenshot-taker/"
    };
  }
  async createScreenshot(options = {}) {
    const {
      url,
      browserWidth = 1600,
      browserHeight = 900,
      fullPage = false,
      deviceScaleFactor = 1,
      format = "png"
    } = options;
    const data = {
      url: url,
      browserWidth: browserWidth,
      browserHeight: browserHeight,
      fullPage: fullPage,
      deviceScaleFactor: deviceScaleFactor,
      format: format
    };
    try {
      const response = await axios({
        method: "post",
        url: this.baseUrl,
        headers: this.headers,
        data: data
      });
      return response.data;
    } catch (error) {
      console.error("Error creating screenshot:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const screenshot = new ScreenshotCreator();
  try {
    const data = await screenshot.createScreenshot(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}