import axios from "axios";
import apiConfig from "@/configs/apiConfig";
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
const bingImageSearch = async query => {
  const code = `
const { chromium } = require('playwright');

async function createImage(query) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.bing.com/images/create', {
    waitUntil: 'networkidle',
  });

  try {
    await page.waitForSelector('#bnp_btn_accept');
    await page.click('#bnp_btn_accept');
  } catch (e) {
    console.log('Accept button not found, continuing...');
  }

  await page.fill('#sb_form_q', query);
  await page.keyboard.press('Enter');

  await page.waitForSelector('.imgpt', {
    timeout: 1000 * 60
  });

  const res = await page.$$eval('.imgpt img', (imgs) => {
    return imgs.map((img) => img.src);
  });

  await page.close();
  await browser.close();

  return { urls: res };
}

createImage('${query}').then(a => console.log(a));`;
  const {
    output
  } = await runPlaywrightCode(code.trim());
  return JSON.parse(output);
};
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Query parameter is required"
    });
  }
  try {
    const result = await bingImageSearch(query);
    Promise.resolve(result).then(() => {
      console.log("Query processing complete!");
    }).catch(error => {
      console.error("Error processing query:", error);
    });
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to fetch image from Bing"
    });
  }
}