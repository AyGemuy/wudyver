import axios from "axios";
import * as cheerio from "cheerio";
class SFileScraper {
  constructor() {
    this.url = "https://try.playwright.tech/service/control/run";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: "https://try.playwright.tech/"
    };
  }
  async execute(code) {
    try {
      const {
        data
      } = await axios.post(this.url, {
        code: code,
        language: "javascript"
      }, {
        headers: this.headers
      });
      return JSON.parse(data.output);
    } catch (error) {
      console.error("Request failed:", error.message);
      return null;
    }
  }
  async search(query) {
    const script = `
      const { chromium } = require('playwright');

      (async () => {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(\`https://sfile.mobi/search.php?q=\${encodeURIComponent("${query}")}&search=Search\`, { waitUntil: 'domcontentloaded' });

        let results = [];
        try {
            await page.waitForSelector('.list a', { timeout: 10000 });
            results = await page.$$eval('.list', els => 
                els.map(el => {
                    const a = el.querySelector('a');
                    return a ? { 
                        name: a.textContent.trim(), 
                        size: (el.textContent.match(/\\(([^)]+)\\)/) || [])[1] || 'Unknown', 
                        link: a.href 
                    } : null;
                }).filter(Boolean)
            );
        } catch {}

        await browser.close();
        console.log(JSON.stringify(results));
      })();
    `;
    return await this.execute(script);
  }
  async download(url) {
    const script = `
      const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto("${url}", { waitUntil: "domcontentloaded" });
    const cookies = await page.context().cookies();

    try {
      await page.waitForSelector("#download", { timeout: 10000, state: "visible" });
    } catch {
      await page.waitForFunction(() => {
        const btn = document.querySelector("#download");
        return btn && getComputedStyle(btn).display !== "none" && btn.offsetHeight > 0;
      }, { timeout: 10000 });
    }

    const downloadUrl = await page.evaluate(() => document.querySelector("#download")?.href);
    if (!downloadUrl) throw new Error("Download URL tidak ditemukan!");

    await page.context().addCookies(cookies);
    await page.goto(downloadUrl, { waitUntil: "domcontentloaded" });

    const results = (await page.content());
    console.log(JSON.stringify({ html: results }));
  } catch (err) {
    console.error(err.message);
  } finally {
    await browser.close();
  }
})();
    `;
    const {
      html: downloadPage
    } = await this.execute(script);
    const $$ = cheerio.load(downloadPage);
    const finalUrl = $$("a.w3-button.w3-blue.w3-round#download").attr("href");
    const htmlDl = $$(".menu.downloadbox").html().trim();
    const keyMatch = htmlDl.match(/&amp;k='\+(.*?)';/);
    const key = keyMatch ? keyMatch[1].replace(/'/g, "") : "";
    const fullUrl = finalUrl ? `${finalUrl}${key ? `&k=${key}` : ""}` : null;
    const filesize = $$("body").text().match(/Download File \((.*?)\)/)?.[1];
    const description = $$('meta[name="description"]').attr("content") || "";
    const ogTitle = $$('meta[property="og:title"]').attr("content") || "";
    const ogDescription = $$('meta[property="og:description"]').attr("content") || "";
    const ogUrl = $$('meta[property="og:url"]').attr("content") || "";
    const fileName = $$("h1.w3-text-blue b").text() || "";
    const fileSizeFromHeader = $$("h1.w3-text-blue").text().match(/\((.*?)\)/)?.[1];
    if (!fullUrl) throw new Error("Link unduhan tidak ditemukan");
    return {
      size: filesize || fileSizeFromHeader || "Unknown",
      link: fullUrl,
      description: description,
      title: ogTitle,
      ogDescription: ogDescription,
      ogUrl: ogUrl,
      fileName: fileName
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!action) return res.status(400).json({
    error: "Missing action parameter"
  });
  const scraper = new SFileScraper();
  try {
    let result;
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: "Missing query parameter"
        });
        result = await scraper.search(query);
        break;
      case "download":
        if (!url) return res.status(400).json({
          error: "Missing url parameter"
        });
        result = await scraper.download(url);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}