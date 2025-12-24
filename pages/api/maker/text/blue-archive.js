import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class PlaywrightAPI {
  constructor() {
    this.apiUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
    };
  }
  async runCode({
    textL = "blue",
    textR = "archive",
    textSub = "블루 아카이브",
    textColor = "2B2B2B",
    pointColor = "128AFA",
    x = "-15",
    y = "0"
  }) {
    const data = {
      code: `const textL = '${textL}';
const textR = '${textR}';
const textSub = '${textSub}';
const textColor = '${textColor}';
const pointColor = '${pointColor}';
const x = '${x}';
const y = '${y}';
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://symbolon.pages.dev/');
    await page.fill('#textL', textL);
    await page.fill('#textR', textR);
    await page.fill('#textSub', textSub);
    const upperCaseTextColor = textColor.toUpperCase();
    const upperCasePointColor = pointColor.toUpperCase();
    await page.evaluate((color) => {
      document.querySelector('#textColor').value = '#' + color;
    }, upperCaseTextColor);
    await page.evaluate((color) => {
      document.querySelector('#pointColor').value = '#' + color;
    }, upperCasePointColor);
    await page.check('#transparent');
    await page.fill('#graphX', x);
    await page.fill('#graphY', y);
    await page.waitForFunction(async () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const initialData = canvas.toDataURL();
      await new Promise(resolve => setTimeout(resolve, 500));
      const newData = canvas.toDataURL();
      return newData !== initialData;
    }, { timeout: 5000 });
    const base64 = await page.evaluate(async () => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        return canvas.toDataURL('image/png').split(',')[1];
      }
      return null;
    });
    if (base64) {
      console.log(base64);
    } else {
      console.error('Could not retrieve image data from the canvas.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await page.close();
    await browser.close();
  }
})();`
    };
    try {
      const res = await axios.post(this.apiUrl, data, {
        headers: this.headers
      });
      return Buffer.from(res.data?.output?.trim() || "", "base64");
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const playwrightService = new PlaywrightAPI();
  try {
    const imageBuffer = await playwrightService.runCode(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Error API:", error);
    res.status(500).json({
      error: "API Error"
    });
  }
}