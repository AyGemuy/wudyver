import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class Spicychat {
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
      id = "481eee5a-3bc8-4f4d-89d1-96ba1666509f"
    } = params;
    const payload = {
      code: `
        const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('https://spicychat.ai/chat/${id}', { waitUntil: 'domcontentloaded' });
        const inputSelector = 'textarea[aria-label="Input message"]';
        await page.waitForSelector(inputSelector);
        await page.fill(inputSelector, '${prompt}');
        const sendButtonSelector = 'button[type="send"]';
        await page.waitForSelector(sendButtonSelector);
        await page.click(sendButtonSelector);
        await page.waitForSelector('span.text-foreground.mb-0\\\\.5', { state: 'visible', timeout: 10000 });

        const messagesData = await page.$$eval('.relative.flex.p-3.flex-auto.flex-col', elements => {
            const result = {};
            elements.forEach((element) => {
                const name = element.querySelector('.font-bold')?.innerText || 'Unknown';
                const messageElements = element.querySelectorAll('span.my-\\\\[8px\\\\].leading-6');
                const messages = Array.from(messageElements).map(msgElement => {
                    const text = msgElement.innerText;
                    return { text };
                });

                if (!result[name]) {
                    result[name] = { name, messages: [] };
                }
                result[name].messages.push(...messages);
            });
            return Object.values(result);
        });

        console.log(messagesData[0].messages.pop());
    } catch (error) {
        console.error('Error while sending message:', error);
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
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('https://spicychat.ai/?characters%2Fsort%2Fnum_messages_24h%3Adesc%5Bquery%5D=${query}', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('div.is_CharacterCard', { state: 'visible', timeout: 10000 });

        const charactersData = await page.$$eval('div.is_CharacterCard', elements => {
            return elements.map(element => {
                const id = element.getAttribute('id');
                if (!id) return null;

                const name = element.querySelector('p[style*="font-weight: 700"]')?.innerText || 'Unknown';
                const creator = element.querySelector('p[style*="font-weight: 400"]')?.innerText || 'Unknown';
                const description = element.querySelector('span._dsp_contents p')?.innerText || 'No description';
                const avatar = element.querySelector('img')?.src || '';

                const stats = Array.from(element.querySelectorAll('div._dsp-flex._ai-stretch._fb-auto._bxs-border-box._pos-relative._mih-0px._miw-0px._fs-0._fd-row._jc-space-betwe3241 p'))
                    .map(stat => stat.innerText);

                return { id, name, creator, description, avatar, stats };
            }).filter(character => character !== null);
        });

        console.log(charactersData);
    } catch (error) {
        console.error('Error while fetching character data:', error);
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
  const spicychat = new Spicychat();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Missing required parameters: prompt"
          });
        }
        result = await spicychat.chat(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Missing required parameter: query"
          });
        }
        result = await spicychat.search(params);
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