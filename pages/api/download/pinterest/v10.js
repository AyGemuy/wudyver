import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class PlaywrightAPI {
  constructor() {
    this.apiUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
  }
  async download(url) {
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
    const data = {
      code: `
        const { chromium } = require('playwright');

        (async () => {
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();

          try {
            await page.goto('${url}', { waitUntil: 'load', timeout: 60000 });

            const [media, metadata] = await Promise.all([
              page.evaluate(() => {
                const getMedia = s => [...document.querySelectorAll(s)].map(el => el.src || el.getAttribute('src'));
                return ['img', 'video', 'source'].reduce((acc, tag) => {
                  const elements = getMedia(\`div.XiG.zI7.iyn.Hsu \${tag}\`);
                  if (elements.length) acc[tag] = elements;
                  return acc;
                }, {});
              }),
              page.evaluate(() => {
                const getMeta = s => document.querySelector(s)?.content || null;
                return {
                  title: document.title,
                  description: getMeta('meta[name="description"]'),
                  ogImage: getMeta('meta[property="og:image"]'),
                  ogTitle: getMeta('meta[property="og:title"]'),
                  ogDescription: getMeta('meta[property="og:description"]'),
                };
              })
            ]);

            const result = JSON.stringify({
              finalUrl: page.url(),
              ...(Object.keys(media).length && { media }),
              metadata,
            });

            console.log(result);
          } catch (e) {
            console.error(JSON.stringify({ error: e.message }));
          } finally {
            await browser.close();
          }
        })();
      `
    };
    try {
      const response = await axios.post(this.apiUrl, data, {
        headers: headers
      });
      const output = JSON.parse(response.data.output);
      console.log("Parsed Output:", output);
      return output;
    } catch (error) {
      console.error("Error fetching Playwright data:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const downloader = new PlaywrightAPI();
  try {
    const data = await downloader.download(params.url);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}