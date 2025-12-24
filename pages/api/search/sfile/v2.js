import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class PlaywrightDownloader {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
    };
  }
  async search({
    query
  }) {
    const data = {
      code: `const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://sfile.mobi/search.php?q=${query}&search=Search');

  let results = [];

  try {
    results = await page.$$eval('.list', items => {
      return items.map(item => {
        const name = item.querySelector('a')?.textContent.trim();
        const link = item.querySelector('a')?.getAttribute('href');
        const size = item.textContent.split('(')[1]?.split(')')[0]?.trim() || 'Unknown';
        if (name && link) {
          return { name, link, size };
        }
        return null;
      }).filter(item => item !== null);
    });
  } catch (error) {
    console.error('Error during data extraction:', error);
  } finally {
    console.log(results);
    try {
      await browser.close();
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
})();`
    };
    try {
      const response = await axios.post(this.url, data, {
        headers: this.headers
      });
      const parsedData = JSON.parse(response.data?.output);
      return parsedData;
    } catch (error) {
      console.error("Error during the request:", error);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query is required"
    });
  }
  const httpRequest = new PlaywrightDownloader();
  try {
    const data = await httpRequest.search(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during request"
    });
  }
}