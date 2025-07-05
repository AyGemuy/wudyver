import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class NueLink {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
    };
  }
  async generate(params) {
    const {
      prompt,
      style = "Cyberpunk"
    } = params;
    const payload = {
      code: `
        const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://nuelink.com/tools/ai-image-generator');
  await page.waitForSelector('textarea#prompt');
  
  const promptText = '${prompt}';
  await page.fill('textarea#prompt', promptText);
  await page.selectOption('select#style', { label: '${style}' });
  await page.click('button#generateBtn');
  
  await page.waitForSelector('#preview');
  
  const screenshotBuffer = await page.screenshot({ type: 'png' });
  console.log(screenshotBuffer.toString('base64'));

  await browser.close();
})();
      `
    };
    try {
      const res = await axios.post(this.url, payload, {
        headers: this.headers
      });
      const buffer = Buffer.from(res.data?.output?.trim() || "", "base64");
      return buffer;
    } catch (error) {
      console.error("Error generating image:", error);
      throw new Error("Failed to generate image");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const nueLink = new NueLink();
  try {
    if (!params.prompt) {
      return res.status(400).json({
        error: "Missing required parameters: prompt"
      });
    }
    const result = await nueLink.generate(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(result);
  } catch (error) {
    console.error("Request failed:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}