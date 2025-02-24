import axios from "axios";
const runPlaywrightCode = async code => {
  try {
    const url = "https://try.playwright.tech/service/control/run";
    const headers = {
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
const dezgoImg = async prompt => {
  const code = `const { chromium, devices } = require('playwright');
const fs = require('fs');

async function flux(prompt) {
    const browser = await chromium.launch({ headless: true });
    const iPhone = devices['iPhone 11'];
    const context = await browser.newContext({
        ...iPhone,
        isMobile: true
    });

    const page = await context.newPage();
    await page.goto('https://dezgo.com/text2image/sdxl');
    await page.waitForTimeout(2000);

    await page.fill('textarea.mud-input-slot', prompt);
    await page.click('button.mud-button-filled');
    await page.waitForSelector('#image-output', { timeout: 0 });
    
    const imageSrc = await page.getAttribute('#image-output', 'src');
    const base64Data = imageSrc.split(',')[1];

    fs.writeFileSync('output_image.png', base64Data, { encoding: 'base64' });
    console.log('Gambar disimpan sebagai output_image.png');

    await browser.close();
}
flux(\`${prompt}\`).then(a => console.log(a));`;
  const start = await runPlaywrightCode("javascript", code);
  const result = start.result.files;
  const urls = result[0].publicURL;
  return {
    url: "https://try.playwright.tech" + urls,
    fileName: result[0].fileName,
    extension: result[0].extension
  };
};
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Missing prompt query parameter"
    });
  }
  try {
    const imageData = await dezgoImg(prompt);
    res.status(200).json(imageData);
  } catch (error) {
    res.status(500).json({
      error: "Error generating image",
      details: error.message
    });
  }
}