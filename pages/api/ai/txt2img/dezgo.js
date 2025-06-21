import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class PlaywrightAPI {
  constructor() {
    this.apiUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
  }
  async create({
    prompt,
    transparent = false,
    resolution = 4
  }) {
    const data = {
      code: `
        const { chromium } = require('playwright');
        
        (async () => {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            try {
                await page.goto('https://dezgo.com/text2image/sdxl');
                await page.fill('textarea.mud-input-slot', '${prompt}');
                await page.check('input.mud-switch-input', { checked: ${transparent} });
                await page.fill('input.mud-slider-input', '${resolution}');
                await page.click('button.mud-button-root:has-text("Run")');
                await page.waitForSelector('a[download]', { state: 'visible' });
                
                const base64Image = await page.getAttribute('a[download]', 'href');
                base64Image && console.log(base64Image.split(',')[1]);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                await browser.close();
            }
        })();
      `
    };
    try {
      const res = await axios.post(this.apiUrl, data, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
        }
      });
      return Buffer.from(res.data?.output?.trim() || "", "base64");
    } catch (error) {
      console.error("Error making API request:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt parameter is required"
    });
  }
  const playwrightService = new PlaywrightAPI();
  try {
    const imageBuffer = await playwrightService.create(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Error API:", error);
    res.status(500).json({
      error: "API Error"
    });
  }
}