import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class PlaywrightService {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
    };
  }
  getViewportSettings(type) {
    const viewports = {
      android: {
        width: 412,
        height: 915,
        userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
      },
      tablet: {
        width: 800,
        height: 1280,
        userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
      },
      pc: {
        width: 1280,
        height: 720,
        userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
      }
    };
    return viewports[type] || viewports.pc;
  }
  async runCode({
    url,
    viewport = "pc",
    fullPage = true,
    headless = true
  }) {
    const {
      width,
      height,
      userAgent
    } = this.getViewportSettings(viewport);
    const data = {
      code: `const { chromium } = require('playwright');
      (async () => {
          let browser;
          try {
              browser = await chromium.launch({ headless: ${headless} });
              const context = await browser.newContext({
                  viewport: { width: ${width}, height: ${height} },
                  userAgent: '${userAgent}'
              });
              const page = await context.newPage();
              await page.goto('${url}', { waitUntil: 'networkidle' });
              console.log((await page.screenshot({ fullPage: ${fullPage} })).toString('base64'));
          } catch (e) {
              console.error(e.message);
          } finally {
              await browser?.close();
          }
      })();`,
      language: "javascript"
    };
    try {
      const res = await axios.post(this.url, data, {
        headers: this.headers
      });
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
  const params = method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "URL parameter is required"
    });
  }
  const playwrightService = new PlaywrightService();
  try {
    const imageBuffer = await playwrightService.runCode(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Error generating image:", error);
    res.status(500).json({
      error: "Failed to generate image"
    });
  }
}