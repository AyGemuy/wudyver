import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class IgramWorld {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
    };
  }
  async fetchData(instagramUrl) {
    try {
      const payload = {
        code: `const { chromium } = require('playwright');

        (async () => {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto('https://igram.world/');
            await page.fill('#search-form-input', '${instagramUrl}');
            await page.click('.search-form__button');
            await page.waitForSelector('.search-result', { timeout: 10000, state: 'visible' });
            await page.waitForSelector('.search-result.show .output-component .output-list__list', { timeout: 20000 });
            const result = await page.evaluate(() => {
                const container = document.querySelector('.search-result.show .output-component .output-list__list');
                if (!container) return null;
                return Array.from(container.querySelectorAll('.output-list__item')).map(item => {
                    return {
                        thumb: item.querySelector('img')?.src || null,
                        url: item.querySelector('a.button__download')?.href || null,
                        caption: document.querySelector('.output-list__caption p')?.innerText || null,
                        likes: document.querySelector('.output-list__info-like')?.innerText || null,
                        time: document.querySelector('.output-list__info-time')?.title || null,
                    };
                });
            });
            console.log(JSON.stringify(result, null, 2));
    await browser.close();
        })();`,
        language: "javascript"
      };
      const response = await axios.post(this.url, payload, {
        headers: this.headers
      });
      const output = JSON.parse(response.data.output);
      console.log("Parsed Output:", output);
      return output;
    } catch (error) {
      console.error("Error fetching data:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL diperlukan."
      });
    }
    const igram = new IgramWorld();
    const result = await igram.fetchData(url);
    return res.status(200).json({
      result: result
    });
  } catch (err) {
    res.status(500).json({
      message: "Terjadi kesalahan.",
      error: err.message
    });
  }
}