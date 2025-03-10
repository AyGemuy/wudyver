import axios from "axios";
class NueLink {
  constructor() {
    this.url = `https://${process.env.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
    };
  }
  async fetchBuffer(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error("Error fetching the blob:", error);
      throw new Error("Failed to fetch buffer");
    }
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
          await page.waitForSelector('a#downloadImg', { state: 'visible' });
          const downloadLink = await page.getAttribute('a#downloadImg', 'href');
          const result = { link: downloadLink };
          console.log(JSON.stringify(result, null, 2));
          await browser.close();
        })();
      `
    };
    try {
      const response = await axios.post(this.url, payload, {
        headers: this.headers
      });
      const link = JSON.parse(response.data.output)?.link;
      return await this.fetchBuffer(link);
    } catch (error) {
      console.error("Error generating image:", error);
      throw new Error("Failed to generate image");
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const nueLink = new NueLink();
  try {
    if (!params.prompt) {
      return res.status(400).json({
        error: "Missing required parameters: prompt"
      });
    }
    const result = await nueLink.generate(params);
    res.setHeader("Content-Type", "image/png");
    res.status(200).send(result);
  } catch (error) {
    console.error("Request failed:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}