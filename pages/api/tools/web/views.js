// pages/api/view.js

import axios from 'axios';
import { unstable_after as after } from 'next/server'

const playwright = {
  avLang: ['javascript', 'python', 'java', 'csharp'],
  
  request: async function(language = 'javascript', code) {
    if (!this.avLang.includes(language.toLowerCase())) {
      throw new Error(`Language "${language}" is not supported. Choose from available languages: ${this.avLang.join(', ')}`);
    }

    const url = 'https://try.playwright.tech/service/control/run';
    const headers = {
      'authority': 'try.playwright.tech',
      'accept': '*/*',
      'content-type': 'application/json',
      'origin': 'https://try.playwright.tech',
      'referer': 'https://try.playwright.tech/?l=playwright-test',
      'user-agent': 'Postify/1.0.0',
    };

    const data = {
      code: code,
      language: language
    };

    try {
      const response = await axios.post(url, data, { headers });
      const { success, error, version, duration, output, files } = response.data;
      return { success, error, version, duration, output, files };
    } catch (error) {
      if (error.response) {
        const { success, error: errMsg, version, duration, output, files } = error.response.data;
        return { success, error: errMsg, version, duration, output, files };
      } else {
        throw new Error(error.message);
      }
    }
  }
};

export default async function handler(req, res) {
  const { url, count } = req.query;

  if (!url || !count) {
    return res.status(400).json({ error: 'Missing required parameters: url and count' });
  }

  const language = 'javascript';
  const code = `
    const { chromium } = require('playwright');
    (async () => {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        const targetUrl = '${url}';

        for (let i = 0; i < ${count}; i++) {
            await page.goto(targetUrl);
            console.log(\`View \${i + 1}: \${targetUrl}\`);
            await page.waitForTimeout(3000);  // Delay for 3 seconds before next view
        }

        await browser.close();
    })();
  `;
after(async () => {
  try {
    const data = await playwright.request(language, code);
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
  });
}
