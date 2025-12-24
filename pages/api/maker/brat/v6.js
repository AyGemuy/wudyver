import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class PlaywrightAPI {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
  }
  async executePlaywright({
    text,
    color = "white"
  }) {
    try {
      const code = `
                const { chromium } = require('playwright');
                (async () => {
                    try {
                        const text = '${text}', color = '${color}';
                        const browser = await chromium.launch({ headless: true });
                        const page = await browser.newPage();
                        await page.goto('https://www.bratgenerator.com/', { waitUntil: 'domcontentloaded' });

                        await page.click(\`#toggleButton\${color.charAt(0).toUpperCase() + color.slice(1)}\`);
                        await page.fill('#textInput', text);
                        await page.waitForTimeout(1000);

                        const textOverlay = await page.$('#textOverlay');
                        if (textOverlay) {
                            const buffer = await textOverlay.screenshot();
                            console.log(buffer.toString('base64'));
                        } else {
                            console.log('Elemen tidak ditemukan');
                        }

                        await browser.close();
                    } catch (error) {
                        console.error(error);
                    }
                })();
            `;
      const res = await axios.post(this.url, {
        code: code
      }, {
        headers: this.headers
      });
      return Buffer.from(res.data?.output?.trim() || "", "base64");
    } catch (error) {
      console.error(error);
      return Buffer.from("", "base64");
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