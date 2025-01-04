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
    const url = "https://try.playwright.tech/service/control/run";
    const headers = {
      authority: "try.playwright.tech",
      accept: "*/*",
      "content-type": "application/json",
      origin: "https://try.playwright.tech",
      referer: "https://try.playwright.tech/?l=playwright-test",
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
        viewport: { width: 375, height: 812 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
    });
    const page = await context.newPage();

  try {
    const content = \`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Brat Text</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 5px;
      box-sizing: border-box;
      background-color: white;
    }

    .text-box {
      width: 100vh;
      height: 100vh;
      max-width: calc(100% - 100px);
      max-height: calc(100% - 100px);
      padding: 5px;
      box-sizing: border-box;
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: justify;
      overflow: hidden;
    }

    .text-box p {
      margin: 0;
      line-height: 1.2;
      word-break: break-word;
      height: auto;
      text-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
      filter: blur(3px);
    }
  </style>
</head>
<body>
  <div class="text-box">
    <p id="text-content">${encodedText}</p>
  </div>

  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script>
    function adjustTextSize() {
      const $container = $('.text-box');
      const $text = $('#text-content');
      const containerWidth = $container.width();
      const containerHeight = $container.height();
      let fontSize = Math.min(containerWidth, containerHeight);

      $text.css('font-size', fontSize + 'px');

      while (($text.outerWidth() > containerWidth || $text.outerHeight() > containerHeight) && fontSize > 10) {
        fontSize--;
        $text.css('font-size', fontSize + 'px');
      }

      while ($text.outerWidth() < containerWidth && $text.outerHeight() < containerHeight) {
        fontSize++;
        $text.css('font-size', fontSize + 'px');
        if ($text.outerWidth() > containerWidth || $text.outerHeight() > containerHeight) {
          fontSize--;
          $text.css('font-size', fontSize + 'px');
          break;
        }
      }
    }

    $(document).ready(function() {
      adjustTextSize();
      $(window).on('resize', adjustTextSize);
    });
  </script>
</body>
</html>\`;

    await page.setContent(content);
    const screenshotBuffer = await page.screenshot({ type: 'png' });
    await browser.close();
    return screenshotBuffer.toString('base64');
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    await browser.close();
  }
}

brat('${encodedText}').then(a => console.log(a));`;
  const {
    output
  } = await runPlaywrightCode(code.trim());
  return output;
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
    return res.status(200).send(Buffer.from(result, "base64"));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to generate brat image"
    });
  }
}