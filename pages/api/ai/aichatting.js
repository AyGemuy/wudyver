import axios from "axios";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      message: "Method not allowed"
    });
  }
  try {
    const {
      query
    } = req.method === "GET" ? req.query : req.body;
    if (!query) {
      return res.status(400).json({
        message: "Query is required"
      });
    }
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
    res.status(200).json({
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