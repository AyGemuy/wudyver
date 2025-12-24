import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class Fsymbols {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
    };
  }
  async generate({
    text = "blocky",
    type = "blocky"
  }) {
    try {
      const code = `
        const { chromium } = require('playwright');

        (async () => {
          const text = '${text}';
          const type = '${type}';

          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();

          try {
            await page.goto('https://fsymbols.com/generators/' + type);
            await page.fill("#Write_your_text_here", text);
            const results = await page.locator('.translated_text').allTextContents();

            console.log(JSON.stringify(results, null, 2));
          } catch (error) {
            console.error(JSON.stringify({ error: error.message }));
          } finally {
            await browser.close();
          }
        })();
      `;
      const response = await axios.post(this.url, {
        code: code,
        language: "javascript"
      }, {
        headers: this.headers
      });
      let outputData;
      try {
        outputData = JSON.parse(response.data.output);
      } catch (parseError) {
        throw new Error(`Failed to parse Playwright output: ${parseError.message}`);
      }
      return outputData;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Text is required"
    });
  }
  try {
    const fsymbol = new Fsymbols();
    const result = await fsymbol.generate(params);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}