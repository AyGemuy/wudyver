const axios = require("axios");
class PlaywrightAPI {
  constructor() {
    this.apiUrl = `https://${process.env.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
    };
  }
  async runCode({
    textL = "blue",
    textR = "archive",
    textColor = "2B2B2B",
    pointColor = "128AFA",
    x = "-15",
    y = "0"
  }) {
    const data = {
      code: `const { chromium } = require('playwright');
      
      (async () => {
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();
          try {
              await page.goto('https://symbolon.pages.dev/');
              await page.fill('#textL', '${textL}');
              await page.fill('#textR', '${textR}');
              await page.evaluate(() => { document.querySelector('#textColor').value = '#${textColor}'; });
              await page.evaluate(() => { document.querySelector('#pointColor').value = '#${pointColor}'; });
              await page.check('#transparent');
              await page.fill('#graphX', '${x}');
              await page.fill('#graphY', '${y}');
              await page.waitForSelector('#save');
              
              const [download] = await Promise.all([
                  page.waitForEvent('download'),
                  page.click('#save')
              ]);
              
              const filePath = await download.path();
              
              const base64 = await page.evaluate(async (filePath) => {
                  const response = await fetch(filePath);
                  const blob = await response.blob();
                  const reader = new FileReader();
                  return new Promise((resolve, reject) => {
                      reader.onloadend = () => resolve(reader.result.split(',')[1]);
                      reader.onerror = reject;
                      reader.readAsDataURL(blob);
                  });
              }, filePath);
              
              // Log only the Base64 string of the image
              console.log(base64);
          } catch (err) {
              console.error('Error:', err);
          } finally {
              await page.close();
              await browser.close();
          }
      })();`
    };
    try {
      const res = await axios.post(this.apiUrl, data, {
        headers: this.headers
      });
      return Buffer.from(res.data?.output?.trim() || "", "base64");
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const playwrightService = new PlaywrightAPI();
  try {
    const imageBuffer = await playwrightService.runCode(params);
    res.setHeader("Content-Type", "image/png");
    res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Error generating brat image:", error);
    res.status(500).json({
      error: "Failed to generate brat image"
    });
  }
}