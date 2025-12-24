import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class OoAi {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
    };
  }
  async search({
    prompt = "halo"
  }) {
    const payload = {
      code: `
                const { chromium } = require('playwright');

                (async () => {
                    const browser = await chromium.launch({ headless: true });
                    const page = await browser.newPage();

                    try {
                        await page.goto('https://oo.ai/');
                        await page.waitForSelector('#search-input, meta[http-equiv="refresh"]', { timeout: 30000 });

                        if (await page.$('meta[http-equiv="refresh"]')) 
                            await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

                        await page.waitForSelector('#search-input', { timeout: 30000 });
                        await page.fill('#search-input', '${prompt}');
                        await page.press('#search-input', 'Enter');
                        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

                        let prevRefCount = 0;
                        while (true) {
                            await page.waitForSelector('.reference.svelte-itvmsf', { timeout: 30000 });
                            const refCount = await page.evaluate(() => document.querySelectorAll('.reference.svelte-itvmsf').length);
                            if (refCount > 0 && refCount === prevRefCount) break;
                            prevRefCount = refCount;
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }

                        await page.waitForSelector('.layout.svelte-afoqgi .content.svelte-afoqgi', { timeout: 30000 });

                        const contentData = await page.evaluate(() => ({
                            content: document.querySelector('.layout.svelte-afoqgi .content.svelte-afoqgi')?.textContent.trim() || '',
                            references: Array.from(document.querySelectorAll('.reference.svelte-itvmsf a')).map(a => ({
                                title: a.querySelector('.title.svelte-itvmsf')?.textContent.trim() || '',
                                url: a.href,
                                source: a.querySelector('.sitename.svelte-itvmsf')?.textContent.trim() || '',
                                date: a.querySelector('.date.svelte-itvmsf')?.textContent.trim() || ''
                            }))
                        }));

                        console.log(JSON.stringify(contentData, null, 2));
                    } catch (error) {
                        console.error(error.message);
                    } finally {
                        await browser.close();
                    }
                })();
            `,
      language: "javascript"
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
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) return res.status(400).json({
    error: "Prompt tidak boleh kosong"
  });
  try {
    const chatbot = new OoAi();
    const response = await chatbot.search(params);
    return response ? res.json({
      result: response
    }) : res.status(500).json({
      error: "Gagal mengirim prompt"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}