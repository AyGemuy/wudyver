import axios from "axios";
import apiConfig from "@/configs/apiConfig";
export default async function handler(req, res) {
  try {
    const {
      query
    } = req.method === "GET" ? req.query : req.body;
    if (!query) {
      return res.status(400).json({
        message: "Query is required"
      });
    }
    const url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    const headers = {
      accept: "*/*",
      "content-type": "application/json",
      "user-agent": "Postify/1.0.0"
    };
    const data = {
      code: `
        const { chromium } = require('playwright');
        async function aichat(query) {
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();
          await page.goto('https://www.aichatting.net/');
          await page.waitForSelector('textarea[placeholder="Enter Message"]');
          await page.fill('textarea[placeholder="Enter Message"]', query);
          await page.click('#sendBtn');
          await page.waitForSelector('div#scrollContainer div.MessageItem_wrapper__byAgt');
          const messages = await page.$$eval('div#scrollContainer div.MessageItem_wrapper__byAgt', nodes =>
            nodes.map(node => {
              const message = node.querySelector('.MessageItem_msg__C8oWx span')?.textContent.trim();
              return message ? { message } : null;
            }).filter(item => item !== null)
          );

          await browser.close();
          return (messages.pop())?.message;
        }
        aichat('${query}').then(result => console.log(result));
      `,
      language: "javascript"
    };
    const response = await axios.post(url, data, {
      headers: headers
    });
    return res.status(200).json({
      result: response.data
    });
  } catch (error) {
    console.error("Error running playwright code:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
}