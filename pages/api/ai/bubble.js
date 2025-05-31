import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class Bubble {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
    };
  }
  async chat(params) {
    const {
      prompt
    } = params;
    const payload = {
      code: `
        const { chromium } = require('playwright');

        (async () => {
          const browser = await chromium.launch({ headless: true });
          const context = await browser.newContext();
          const page = await context.newPage();

          try {
            await page.goto('https://gsheets-formula-generator.bubbleapps.io/answer-generator', { waitUntil: 'domcontentloaded' });
            await page.waitForLoadState('networkidle');
            await page.fill('textarea.bubble-element.MultiLineInput', \`\${prompt}\`);
            await page.click('button.clickable-element.Button');
            await page.waitForSelector('div.bubble-element.Group.a1706117113771x206804574838411740.bubble-r-container.flex.row > div.bubble-element.Group.a1706117113771x595772875339621900.bubble-r-container.flex.row > div.bubble-element.Text.a1706117113771x192391349565568700', { visible: true });
            
            const result = await page.locator('div.bubble-element.Group.a1706117113771x206804574838411740.bubble-r-container.flex.row > div.bubble-element.Group.a1706117113771x595772875339621900.bubble-r-container.flex.row > div.bubble-element.Text.a1706117113771x192391349565568700').innerText();
            console.log(JSON.stringify({ result }));
          } catch (error) {
            console.error('Terjadi kesalahan:', error);
          } finally {
            await browser.close();
          }
        })();
      `
    };
    try {
      const response = await axios.post(this.url, payload, {
        headers: this.headers
      });
      return JSON.parse(response.data.output);
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const bubble = new Bubble();
  try {
    if (!params.prompt) {
      return res.status(400).json({
        error: "Missing required parameter: prompt"
      });
    }
    const result = await bubble.chat(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}