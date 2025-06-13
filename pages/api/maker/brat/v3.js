import apiConfig from "@/configs/apiConfig";
import axios from "axios";

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}
const runPlaywrightCode = async code => {
  try {
    const url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    const headers = {
      accept: "*/*",
      "content-type": "application/json",
      "user-agent": "Postify/1.0.0"
    };
    const data = {
      code: code,
      language: "javascript"
    };
    const response = await axios.post(url, data, {
      headers: headers
    });
    return response.data;
  } catch (error) {
    console.error("Error running playwright code:", error);
    throw error;
  }
};
const bratMaker = async text => {
  const encodedText = escapeHTML(text).replace(/\n/g, "<br>");
  const code = `const { chromium } = require('playwright');

async function brat(text) {
  const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 800, height: 800 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
    });
    const page = await context.newPage();

  try {
    const content = \`<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teks Justify Blur Auto Size</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: white; font-family: "Segoe UI Emoji", Arial, sans-serif; 
            display: flex; justify-content: flex-start; align-items: flex-start; 
            height: 100vh; padding: 5vw; text-align: justify; text-justify: inter-word; 
            overflow: hidden;
        }
        .text {
            width: 90vw; font-weight: 400; white-space: pre-wrap; word-wrap: break-word;
            line-height: 1.4; filter: blur(3px); text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }
    </style>
</head>
<body>
    <div class="text" id="dynamicText">${encodedText}</div>

    <script>
        function adjustFontSize() {
            let text = document.getElementById('dynamicText'), size = 10;
            text.style.fontSize = size + "vw";
            while (text.scrollHeight <= window.innerHeight * 0.9 && text.scrollWidth <= window.innerWidth * 0.9) {
                text.style.fontSize = (++size) + "vw"; if (size > 20) break;
            }
        }
        window.onload = window.onresize = adjustFontSize;
    </script>
</body>
</html>\`;

    await page.setContent(content);
    const screenshotBuffer = await page.screenshot({ type: 'png' });
    return screenshotBuffer.toString('base64');
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    await browser.close();
  }
}

brat('${encodedText}').then(a => console.log(a));`;
  const res = await runPlaywrightCode(code.trim());
  return Buffer.from(res.output?.trim() || "", "base64");
};
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    text = "Brat"
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "Text parameter is required"
    });
  }
  try {
    const result = await bratMaker(text);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "API Error"
    });
  }
}