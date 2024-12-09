import axios from 'axios';

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]);
}

const runPlaywrightCode = async (code) => {
  try {
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
      language: 'javascript',
    };
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('Error running playwright code:', error);
    throw error;
  }
};

const codeSnippetMaker = async (code, lang) => {
  const encodedCode = escapeHTML(code);
  
  const codeContent = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Code Snippets Syntax Highlighting</title>
    <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
    }
    .container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f0f0f0;
    }
    deckgo-highlight-code {
      display: block;
      width: 80%;
      max-width: 900px;
      margin: 10px;
      padding: 10px;
      background-color: white;
      border-radius: 5px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    </style>
  </head>
  <body>
    <div class="container">
      <deckgo-highlight-code language="${lang}">
        <code slot="code">${encodedCode}</code>
      </deckgo-highlight-code>
    </div>
    <script type="module" src="https://unpkg.com/@deckdeckgo/highlight-code@latest/dist/deckdeckgo-highlight-code/deckdeckgo-highlight-code.esm.js"></script>
  </body>
  </html>`;

  const codeScript = `const { chromium } = require('playwright');

  async function generateSnippet(code) {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
      const content = \`${codeContent}\`;
      await page.setContent(content);
      const screenshotBuffer = await page.screenshot({ type: 'png' });
      await browser.close();
      return screenshotBuffer.toString('base64');
    } catch (error) {
      console.error('Error generating snippet:', error);
    } finally {
      await browser.close();
    }
  }

  generateSnippet('${encodedCode}').then(a => console.log(a));`;

  const { output } = await runPlaywrightCode(codeScript.trim());
  return output;
};

export default async function handler(req, res) {
  const { method } = req;
  const { code, lang } = req.method === 'GET' ? req.query : req.body;

  if (!code || !lang) {
    return res.status(400).json({ error: 'Code and lang parameters are required' });
  }

  try {
    const result = await codeSnippetMaker(code, lang);
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(Buffer.from(result, 'base64'));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to generate code snippet image' });
  }
}
