import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class PlaywrightAPI {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
    };
  }
  async executePlaywright({
    text,
    preset = "bratdeluxe"
  }) {
    const data = {
      code: `const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://bratify.vercel.app');

    await page.selectOption('#preset', '${preset}');

    const textSelector = 'section.shadow.svelte-2myyu4 div[contenteditable="true"]';
    await page.waitForSelector(textSelector);
    await page.evaluate(selector => document.querySelector(selector).innerText = '', textSelector);
    await page.type(textSelector, '${text}');

    const sectionSelector = 'section.shadow.svelte-2myyu4';
    await page.waitForSelector(sectionSelector);
    const screenshotBuffer = await page.screenshot({ clip: await page.locator(sectionSelector).boundingBox() });

    console.log(screenshotBuffer.toString('base64'));
    await browser.close();
})();`
    };
    try {
      const res = await axios.post(this.url, data, {
        headers: this.headers
      });
      return Buffer.from(res.data?.output?.trim() || "", "base64");
    } catch (e) {
      throw new Error("Error fetching data: " + e.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Text parameter is required"
    });
  }
  const api = new PlaywrightAPI();
  try {
    const imageBuffer = await api.executePlaywright(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Error API:", error);
    res.status(500).json({
      error: "API Error"
    });
  }
}