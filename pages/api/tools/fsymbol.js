import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class Fsymbols {
  constructor(inputText) {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
    };
    this.inputText = inputText;
  }
  async run() {
    try {
      const code = `
                const { chromium } = require('playwright');
                (async () => {
                    try {
                        const browser = await chromium.launch({ headless: true });
                        const page = await browser.newPage();
                        await page.goto('https://fsymbols.com/generators/carty/');
                        await page.fill('#Write_your_text_here', '${this.inputText}');
                        await page.waitForTimeout(2000);
                        const outputData = await page.evaluate(() => 
                            [...document.querySelectorAll('.translated_text')].map((el, i) => el.innerText || document.querySelectorAll('.copy_button_transl')[i]?.getAttribute('data-clipboard-text') || '')
                        );
                        console.log(JSON.stringify(outputData, null, 2));
                        await browser.close();
                    } catch (e) { console.error(e); }
                })();
            `;
      const response = await axios.post(this.url, {
        code: code,
        language: "javascript"
      }, {
        headers: this.headers
      });
      const outputData = JSON.parse(response.data.output);
      return outputData;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    text
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "Text are required"
    });
  }
  try {
    const fsymbol = new Fsymbols(text);
    const result = await fsymbol.run();
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}