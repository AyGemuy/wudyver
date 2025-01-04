import axios from "axios";
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
const pornhubMaker = async (left, right) => {
  const text1 = left;
  const text2 = right;
  const code = `const { chromium } = require('playwright');

async function pornhub(text1, text2) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const content = \`<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8">
  <title>PornHub logo</title>
  <style>
  html {
  height: 100%;
}

body {
  background: #000000;
  color: #ffffff;
  margin: 0;
  min-height: 100%;
  height: 100%;
  position: relative;
}

.hub {
  display: block;
  font-family: sans-serif;
  font-weight: bold;
  font-size: 9vw;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.hub span:nth-child(2) {
  background: #FF9900;
  color: #000000;
  border-radius: 1vw;
  padding: 0 1vw 1vw 1vw;
  display: inline-block;
}
</style>
</head>
<body>
<!-- partial:index.partial.html -->
<div class="hub">
  <span contenteditable="true">${text1}</span>
  <span contenteditable="true">${text2}</span>
</div>
<!-- partial -->
  
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

pornhub('${text1}', '${text2}').then(a => console.log(a));`;
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
    text1,
    text2
  } = req.method === "GET" ? req.query : req.body;
  if (!(text1 || text2)) {
    return res.status(400).json({
      error: "Text parameter is required"
    });
  }
  try {
    const result = await pornhubMaker(text1, text2);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result, "base64"));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to generate pornhub image"
    });
  }
}