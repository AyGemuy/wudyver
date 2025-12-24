import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class PlaywrightDownloader {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
    };
  }
  async download({
    url
  }) {
    const data = {
      code: `const { chromium } = require('playwright');

      (async () => {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        try {
          await page.goto('${url}');
          const downloadButtonSelector = 'a#download.w3-button.w3-blue.w3-round';
          await page.waitForSelector(downloadButtonSelector, { state: 'visible' });

          const cookies = await page.context().cookies();

          const metaData = await page.evaluate(() => {
            const name = document.querySelector('.file-content .list:nth-of-type(2) a')?.textContent.trim() || 'Unknown';
            const type = document.querySelector('.file-content .list')?.textContent.split(' - ')[1].trim() || 'Unknown';
            const uploader = document.querySelector('.file-content .list:nth-of-type(3) a')?.textContent.trim() || 'Unknown';
            const desc = document.querySelector('.file-content .list:nth-of-type(1)')?.textContent.replace('Uploaded: ', '').trim() || 'Unknown';
            const date = document.querySelector('.file-content .list:nth-of-type(4)')?.textContent.replace('Downloads: ', '').trim() || 'Unknown';
            const html = document.querySelector('.file-content')?.outerHTML || 'No description available';

            return { name, type, uploader, desc, date, html };
          });

          let downloadUrl = await page.$eval(downloadButtonSelector, el => el.href);

          const newPage = await browser.newPage();
          await newPage.context().addCookies(cookies);
          
          await newPage.goto(downloadUrl);

          const finalLink = await newPage.evaluate(() => {
            const scriptContent = [...document.scripts]
              .map(script => script.innerHTML)
              .find(content => content.includes('var sf'));
            
            return scriptContent ? scriptContent : null;
          });

          const cleanedFinalLink = finalLink ? finalLink : '';

          const result = {
            ...metaData,
            dlLink: cleanedFinalLink,
          };

          console.log(JSON.stringify(result, null, 2));

        } catch (error) {
          console.error("Error during the download process:", error);
        } finally {
          await browser.close();
        }
      })();`
    };
    try {
      const response = await axios.post(this.url, data, {
        headers: this.headers
      });
      const parsedData = JSON.parse(response.data?.output);
      const dlLink = (parsedData.dlLink.match(/var sf = "(.*?)"/)?.[1] || "").replace(/\\/g, "") || "";
      if (dlLink) {
        const fileMetadata = await this.getFileMetadata(dlLink);
        return {
          ...parsedData,
          dlLink: dlLink,
          ...fileMetadata
        };
      } else {
        console.error("No valid download link found.");
        return parsedData;
      }
    } catch (error) {
      console.error("Error during the request:", error);
    }
  }
  async getFileMetadata(link) {
    try {
      const response = await axios.head(link, {
        headers: this.headers
      });
      return {
        size: response.headers["content-length"] ? `${(response.headers["content-length"] / 1024 / 1024).toFixed(2)} MB` : "Unknown",
        mime: response.headers["content-type"] || "Unknown"
      };
    } catch (error) {
      return {
        size: "Unknown",
        mime: "Unknown"
      };
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
  const httpRequest = new PlaywrightDownloader();
  try {
    const data = await httpRequest.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during request"
    });
  }
}