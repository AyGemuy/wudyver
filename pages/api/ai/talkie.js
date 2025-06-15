import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class Talkie {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
    };
  }
  async chat(params) {
    const {
      prompt,
      id = "bunny-74255614873878"
    } = params;
    const payload = {
      code: `
        const { chromium } = require('playwright');

        (async () => {
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();

          try {
            await page.goto('https://www.talkie-ai.com/chat/${id}');

            await page.waitForSelector('.ChatBox_inputContainer__yeDYQ textarea');
            await page.fill('.ChatBox_inputContainer__yeDYQ textarea', '${prompt}');
            await page.evaluate(() => document.querySelector('.ChatBox_sendBtn__vPHE3')?.click());

            await page.waitForTimeout(500);
            await page.mouse.click(500, 500);
            await page.waitForTimeout(200);
            await page.mouse.click(500, 500);

            await page.waitForSelector('#message-container', { timeout: 60000 });

            const messages = await page.$$eval('#message-container .Message_messageWrap__G5wV7', (nodes) =>
  nodes
    .map((node) => ({
      text: node.querySelector('.Message_text__M_R1o p')?.innerText || null,
      img: node.querySelector('.Message_audio__bKnna img:nth-child(2)')?.src || null
    }))
    .filter((message) => message.text && message.img)
);

console.log(messages);
          } catch (error) {
            console.error("Error in chat interaction:", error);
          } finally {
            await browser.close();
          }
        })();
      `
    };
    try {
      const response = await axios.post(this.url, payload, {
        headers: this.headers
      });
      return JSON.parse(response.data.output);
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
  async search(params) {
    const {
      query
    } = params;
    const payload = {
      code: `
        const { chromium } = require('playwright');

        (async () => {
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();

          try {
            await page.goto('https://www.talkie-ai.com/search/?q=${encodeURIComponent(query)}', { waitUntil: 'domcontentloaded' });

            await page.waitForSelector('.SearchResult_items_box__HNiUo a');

            const results = await page.evaluate(() => {
              return Array.from(document.querySelectorAll('.SearchResult_items_box__HNiUo a')).map(el => ({
                name: el.querySelector('.SearchResult_items_name__PiddS')?.innerText.trim() || "No name",
                link: 'https://www.talkie-ai.com' + el.getAttribute('href'),
                id: el.getAttribute('href').split('/').pop(),
                image: el.querySelector('.SearchResult_items_avatar__iEjP7')?.src || "No image",
                followers: el.querySelector('.SearchResult_follower___jYrH')?.innerText.trim() || "0",
                description: el.querySelector('.SearchResult_items_desc__YxycX')?.innerText.trim() || "No description"
              }));
            });

            console.log(results);
          } catch (error) {
            console.error("Error fetching character data:", error);
          } finally {
            await browser.close();
          }
        })();
      `
    };
    try {
      const response = await axios.post(this.url, payload, {
        headers: this.headers
      });
      return JSON.parse(response.data.output);
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const talkie = new Talkie();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Missing required parameters: prompt"
          });
        }
        result = await talkie.chat(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Missing required parameter: query"
          });
        }
        result = await talkie.search(params);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}