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
const balogoMaker = async (textL = "蔚蓝", textR = "档案", x = "-15", y = "0", tp = false) => {
  const code = `const { chromium } = require('playwright');

async function balogo(textL = "蔚蓝", textR = "档案", x = "-15", y = "0", tp = false) {
  let random = Math.random().toString(36).slice(-8);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});
  const page = await context.newPage();
  await page.goto('https://symbolon.pages.dev'); // Make sure the local server is running

  await page.context().grantPermissions(['downloads']);
  const downloadPath = './pic/' + random + '/';
  await page._client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath
  });

  // Interact with the page elements
  await page.waitForSelector('canvas');
  if (tp === true) {
    await page.evaluate(() => {
      document.querySelector("#transparent").click();
    });
  }
  await page.fill('#graphX', x);
  await page.fill('#graphY', y);
  await page.fill('#textL', textL);
  await page.fill('#textR', textR);
  await page.waitForSelector('#loading.hidden');
  await page.waitForSelector('#loading:not(.hidden)');
  await page.waitForSelector('#loading.hidden');

  // Wait for base64 image and extract it
  const imgButton = await page.waitForSelector("#base64");
  await imgButton.click();
  const imgBase64 = await page.$eval('#base64', el => el.innerText);

  // Close browser
  await browser.close();

  // Convert base64 to Buffer and return the image
  const base64 = imgBase64.replace(/^data:image\/\w+;base64,/, "");
  return base64;
}

balogo('${textL}', '${textR}', '${x}', '${y}', '${tp}').then(a => console.log(a));`;
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
    textL = "蔚蓝",
      textR = "档案",
      x = "-15",
      y = "0",
      tp = false
  } = req.method === "GET" ? req.query : req.body;
  if (!(textL || textR)) {
    return res.status(400).json({
      error: "textL, textR parameter is required"
    });
  }
  try {
    const result = await balogoMaker(textL = "蔚蓝", textR = "档案", x = "-15", y = "0", tp = false);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result, "base64"));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to generate balogo image"
    });
  }
}