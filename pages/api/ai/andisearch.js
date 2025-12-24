import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class AndiSearch {
  constructor() {
    this.baseURL = `https://${apiConfig.DOMAIN_URL}/api/tools`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      Referer: `https://${apiConfig.DOMAIN_URL}/playwright`
    };
  }
  async executePlaywright(code, timeout = 5e3) {
    try {
      const response = await axios.post(`${this.baseURL}/playwright`, {
        code: code,
        timeout: timeout
      }, {
        headers: this.headers,
        decompress: true
      });
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
      throw error;
    }
  }
  async chat({
    prompt
  }) {
    const code = `
      const { chromium } = require('playwright');

      (async () => {
        let browser;
        let page;
        try {
          browser = await chromium.launch({ headless: true });
          const context = await browser.newContext();
          page = await context.newPage();
          await page.goto('https://andisearch.com/', { waitUntil: 'load' });
          await page.waitForSelector('.rcw-input[contenteditable="true"]');
          await page.focus('.rcw-input[contenteditable="true"]');
          await page.keyboard.type('${prompt}');
          await page.click('button.rcw-send');
          await page.waitForSelector('.loader.active', { timeout: 10000 });
          await page.waitForFunction(() => !document.querySelector('.loader')?.classList?.contains('active'), { timeout: 20000 });
          await page.waitForSelector('.rcw-message ');
          const searchResults = await page.$$eval('.rcw-message ', (elements) =>
            elements.map((el) => {
              try {
                const data = {};
                data.paragraphs = Array.from(el.querySelectorAll('p')).map(p => p.innerText);
                data.headings = Array.from(el.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.innerText);
                data.spans = Array.from(el.querySelectorAll('span')).map(s => s.innerText);
                data.divTexts = Array.from(el.querySelectorAll('div')).map(d => d.innerText);
                data.urls = Array.from(el.querySelectorAll('a')).map(a => a.getAttribute('href'));
                data.imageUrls = Array.from(el.querySelectorAll('img')).map(img => img.getAttribute('src'));
                const blockquotes = Array.from(el.querySelectorAll('blockquote'));
                data.blockquotes = blockquotes.map(bq => ({
                  text: bq.innerText,
                  link: bq.querySelector('a[href]')?.getAttribute('href') ?? null,
                }));
                const citationCard = el.querySelector('.lw-citation-card');
                data.citation = citationCard ? {
                  text: citationCard.innerText,
                  iconUrl: citationCard.querySelector('img[src]')?.getAttribute('src') ?? null,
                } : null;
                return data;
              } catch (error) {
                return {};
              }
            })
          );
          console.log(JSON.stringify(searchResults, null, 2));
          return searchResults;
        } catch (error) {
          console.error('Terjadi kesalahan Playwright:', error);
          return null;
        } finally {
          if (page) {
            await page.close();
          }
          if (browser) {
            await browser.close();
          }
        }
      })();
    `;
    try {
      const result = await this.executePlaywright(code);
      return JSON.parse(result?.output) || "";
    } catch (error) {
      console.error("Gagal menjalankan Playwright:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const andi = new AndiSearch();
    const response = await andi.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}