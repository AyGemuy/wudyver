const axios = require("axios");
class PlaywrightAPI {
  constructor() {
    this.url = `https://${process.env.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
    };
  }
  async runCode({
    prompt = "halo"
  }) {
    const payload = {
      code: `const { chromium } = require('playwright');

      (async () => {
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();

          try {
              await page.goto('https://biblegpt-la.com/account/sign-in.html?forward=chat.html');
              await page.click('button:has-text("Guest")');
              await page.waitForNavigation();
              await page.click('button:has-text("Accept")');
              await page.fill('textarea#chat-input', '${prompt}');
              await page.click('button#send-button');
              await page.waitForNavigation();
              await page.waitForSelector('.ai-txt[data-last="true"]', { state: 'visible' });
              const aiResponse = { result: await page.$eval('.ai-txt[data-last="true"]', el => el.textContent.trim()) };
              console.log(JSON.stringify(aiResponse));
          } catch (e) {
              console.error("Error:", e);
          } finally {
              await page.close();
              await browser.close();
          }
      })();`
    };
    try {
      const response = await axios.post(this.url, payload, {
        headers: this.headers
      });
      return JSON.parse(response.data?.output);
    } catch (error) {
      console.error("Request Error:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new PlaywrightAPI();
    const response = await api.runCode(params);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}