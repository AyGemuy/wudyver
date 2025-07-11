import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class PlaywrightService {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
    };
  }
  async runPlaywright(url) {
    try {
      const data = {
        code: `const { chromium } = require('playwright');

        (async () => {
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();
        
          try {
            await page.goto('${url}', { waitUntil: 'networkidle' });
            console.log(JSON.stringify(await page.context().cookies(), null, 2));
          } catch (error) {
            console.error('Error:', error);
          } finally {
            await browser.close();
          }
        })();`,
        language: "javascript"
      };
      const {
        data: {
          output
        }
      } = await axios.post(this.url, data, {
        headers: this.headers
      });
      return JSON.parse(output);
    } catch (error) {
      throw new Error(error);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing required query parameter: url"
    });
  }
  try {
    const playwrightService = new PlaywrightService();
    const result = await playwrightService.runPlaywright(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Handler Error:", error.message);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}