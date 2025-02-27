
import axios from "axios";

class PlaywrightService {
  constructor() {
    this.url = "https://try.playwright.tech/service/control/run";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      Referer: "https://try.playwright.tech/?l=javascript&s=3sz8de9",
    };
  }

  async runCode(theme, inputText) {
    const data = {
      code: `const { chromium } = require('playwright');
        class BratGenerator {
          async run(theme, inputText) {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            try {
              await page.goto('https://www.bratgenerator.com/');
              await page.waitForLoadState('networkidle');
              await page.click(\`#toggleButton\${theme.charAt(0).toUpperCase() + theme.slice(1)}\`);
              await page.fill('#textInput', inputText);
              const textOverlay = await page.waitForSelector('#textOverlay');
              console.log((await textOverlay.screenshot()).toString('base64'));
            } catch (error) {
              console.error('Error:', error);
            } finally {
              await browser.close();
            }
          }
        }
        new BratGenerator().run('${theme}', ${JSON.stringify(inputText)});
      `,
      language: "javascript",
    };

    try {
      const res = await axios.post(this.url, data, { headers: this.headers });
      return Buffer.from(res.data?.output?.trim() || "", "base64");
    } catch (e) {
      throw new Error("Error fetching data: " + e.message);
    }
  }
}

export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    text = "Brat",
color
  } = method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "Text parameter is required"
    });
  }
  const playwrightService = new PlaywrightService();
  try {
    const imageBuffer = await playwrightService
  .runCode(color, text);
    res.setHeader("Content-Type", "image/png");
    res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Error generating brat image:", error);
    res.status(500).json({
      error: "Failed to generate brat image"
    });
  }
}