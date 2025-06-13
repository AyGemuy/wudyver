import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class DeepFake {
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
      style = "024"
    } = params;
    const styleIndices = style.split("").map(num => parseInt(num)).filter(num => !isNaN(num));
    const payload = {
      code: `
        const { chromium } = require('playwright');

        (async () => {
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();
          await page.goto('https://deepfakemaker.io/free-ai-nsfw-art-generator/');
          
          await page.fill('.el-textarea__inner', '${prompt}');
          await page.waitForSelector('.yi-style-options-image');
        
          for (const index of ${JSON.stringify(styleIndices)}) {
            const styleOptionSelector = \`.yi-style-options-image:nth-child(\${index + 1})\`;
            await page.click(styleOptionSelector);
            await page.waitForTimeout(500);
          }
        
          await page.click('.el-button.el-button--primary.w-100');
          await page.waitForSelector('.el-image.h-100.yi-generate-image img', { state: 'visible' });
        
          const imageUrl = await page.getAttribute('.el-image.h-100.yi-generate-image img', 'src');
          const output = { result: imageUrl };
          
          console.log(JSON.stringify(output, null, 2));
          
          await browser.close();
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
  const deepFake = new DeepFake();
  try {
    if (!params.prompt) {
      return res.status(400).json({
        error: "Missing required parameters: prompt"
      });
    }
    const result = await deepFake.generate(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}