import apiConfig from "@/configs/apiConfig";
import axios from "axios";
const runPlaywrightCode = async code => {
  try {
    const response = await axios.post(`https://${apiConfig.DOMAIN_URL}/api/tools/playwright`, {
      code: code,
      language: "javascript"
    }, {
      headers: {
        accept: "*/*",
        "content-type": "application/json",
        "user-agent": "Postify/1.0.0"
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
const bratMaker = async (text, {
  scale = .3,
  scaleX = .6,
  lqSize = 150,
  fullSize = 2048,
  preset = "brat"
} = {}) => {
  const code = `
    const { chromium } = require('playwright');
  
    async function brat(text, scale = ${scale}, scaleX = ${scaleX}, lqSize = ${lqSize}, fullSize = ${fullSize}, preset = "${preset}") {
      let browser;
      try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
          viewport: { width: 800, height: 800 },
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
        });
        const page = await context.newPage();
        await page.goto('https://sheeptester.github.io/words-go-here/misc/kamala.html');
        
        await page.fill('textarea[name="text"]', text);
        await page.fill('input[name="scale"]', scale.toString());
        await page.fill('input[name="scaleX"]', scaleX.toString());
        await page.fill('input[name="lqSize"]', lqSize.toString());
        await page.fill('input[name="fullSize"]', fullSize.toString());

        const screenshotBuffer = await page.locator('#output').screenshot({ type: 'png' });

        return screenshotBuffer.toString('base64');
      } catch (error) {
        console.error("Error during Playwright execution:", error);
        throw error;
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    }
  
    brat('${text}', ${scale}, ${scaleX}, ${lqSize}, ${fullSize}, '${preset}').then(a => console.log(a));`;
  try {
    const {
      output
    } = await runPlaywrightCode(code.trim());
    return Buffer.from(output, "base64");
  } catch (error) {
    console.error("Error in bratMaker:", error);
    throw error;
  }
};
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    text = "Brat", ...options
  } = method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "Text parameter is required"
    });
  }
  try {
    const imageBuffer = await bratMaker(text, options);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({
      error: "API Error"
    });
  }
}