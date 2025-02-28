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
const mediafire = async url => {
  const code = `
const { chromium } = require('playwright');

async function mediafire(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Linux; Android 6.0; iris50) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
  });
  const page = await context.newPage();

  try {
    await page.goto(url);

    let downloadInfo = await page.evaluate(() => {
      const fileNameElement = document.querySelector('.dl-btn-label');
      const fileName = fileNameElement ? fileNameElement.textContent.trim() : '';
      const downloadLinkElement = document.querySelector('#downloadButton');
      const downloadLink = downloadLinkElement ? downloadLinkElement.href : '';
      const fileSizeText = downloadLinkElement ? downloadLinkElement.textContent : '';
      const sizeMatch = fileSizeText.match(/\(([^)]+)\)/);
      const fileSize = sizeMatch ? sizeMatch[1] : '';
      const metaTags = Array.from(document.querySelectorAll('meta')).reduce((acc, meta) => {
        const name = meta.getAttribute('name') || meta.getAttribute('property');
        const content = meta.getAttribute('content');
        if (name && content) acc[name.split(':')[1]] = content;
        return acc;
      }, {});

      return {
        fileName,
        downloadLink,
        fileSize,
        meta: metaTags,
      };
    });

    if (!downloadInfo.downloadLink.startsWith('https://down')) {
      await browser.close();
      const newBrowser = await chromium.launch({ headless: true });
      const newContext = await newBrowser.newContext({
        userAgent: 'Mozilla/5.0 (Linux; Android 6.0; iris50) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
      });
      const newPage = await newContext.newPage();
      await newPage.goto(downloadInfo.downloadLink);
      const updatedInfo = await newPage.evaluate(() => {
        const downloadLink = document.querySelector('#downloadButton')?.href || '';
        return { downloadLink };
      });

      downloadInfo.downloadLink = updatedInfo.downloadLink;
      await newBrowser.close();
    }

    return downloadInfo;
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, message: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

mediafire('${url}').then(screenshot => {
    return screenshot;
});`;
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
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Url parameter is required"
    });
  }
  try {
    const result = await mediafire(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to generate brat image"
    });
  }
}