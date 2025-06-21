import apiConfig from "@/configs/apiConfig";
import axios from "axios";
const playwright = {
  avLang: ["javascript", "python", "java", "csharp"],
  request: async function(language = "javascript", code) {
    if (!this.avLang.includes(language.toLowerCase())) {
      throw new Error(`Language "${language}" is not supported. Choose from: ${this.avLang.join(", ")}`);
    }
    const url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    const headers = {
      "content-type": "application/json"
    };
    try {
      const response = await axios.post(url, {
        code: code,
        language: language
      }, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || error.message);
    }
  }
};
export default async function handler(req, res) {
  const {
    url,
    count
  } = req.method === "GET" ? req.query : req.body;
  if (!url || !count) {
    return res.status(400).json({
      error: "Missing required parameters: url and count"
    });
  }
  const language = "javascript";
  const code = `
    const { chromium } = require('playwright');

    async function view(targetUrl, count) {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      for (let i = 0; i < count; i++) {
        await page.goto(targetUrl);
        console.log(\`View \${i + 1}: \${targetUrl}\`);
        await page.waitForTimeout(3000);
      }

      await browser.close();
    }

    view('${url}', ${count})
      .then(() => console.log('All views completed successfully.'))
      .catch(err => console.error('Error during views:', err));
  `;
  try {
    const data = await playwright.request(language, code);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}