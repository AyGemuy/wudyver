import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class PlaywrightService {
  constructor() {
    this.baseUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
    };
  }
  async runScript(code) {
    try {
      const response = await axios.post(this.baseUrl, {
        code: code,
        language: "javascript"
      }, {
        headers: this.headers
      });
      return JSON.parse(response.data.output);
    } catch (error) {
      throw new Error(`Gagal menjalankan skrip: ${error.message}`);
    }
  }
  async youtubeSearch(query) {
    const code = `
            const { chromium } = require('playwright');
            (async () => {
                const browser = await chromium.launch({ headless: true });
                const page = await browser.newPage();

                try {
                    await page.goto(\`https://www.youtube.com/results?search_query=\${encodeURIComponent('${query}')}\`, { waitUntil: 'domcontentloaded' });

                    const results = await page.evaluate(() => {
                        let scripts = document.querySelectorAll('script');
                        let videoList = [];

                        for (let script of scripts) {
                            let scriptText = script.innerText.trim();
                            let ytInitialDataText = 'var ytInitialData = ';
                            let index = scriptText.indexOf(ytInitialDataText);

                            if (index === -1) continue;

                            try {
                                let ytInitialData = JSON.parse(scriptText.substring(ytInitialDataText.length).split(/\\n/)[0].trim().slice(0, -1));

                                if (ytInitialData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents) {
                                    let contents = ytInitialData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents;

                                    for (let section of contents) {
                                        if (!section.itemSectionRenderer?.contents) continue;

                                        for (let item of section.itemSectionRenderer.contents) {
                                            if (!item.videoRenderer) continue;

                                            let videoId = item.videoRenderer.videoId;
                                            let title = item.videoRenderer.title?.runs?.[0]?.text || 'Unknown';
                                            let channelName = item.videoRenderer.longBylineText?.runs?.[0]?.text || 'Unknown';
                                            let channelId = item.videoRenderer.longBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || 'Unknown';
                                            let thumbHigh = item.videoRenderer.thumbnail?.thumbnails?.pop()?.url || 'Unknown';
                                            let publishedAt = item.videoRenderer.publishedTimeText?.simpleText || 'Unknown';
                                            let duration = item.videoRenderer.lengthText?.simpleText || 'Unknown';
                                            let viewCount = item.videoRenderer.viewCountText?.simpleText || 'Unknown';

                                            videoList.push({ videoId, title, channelName, channelId, thumbHigh, publishedAt, duration, viewCount });
                                        }
                                    }
                                    break;
                                }
                            } catch (e) {
                                continue;
                            }
                        }

                        return JSON.stringify(videoList);
                    });

                    console.log(results);
                    await browser.close();
                } catch (error) {
                    console.error(error);
                    await browser.close();
                }
            })();
        `;
    return await this.runScript(code);
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Paramenter 'query' is required"
    });
  }
  try {
    const playwrightService = new PlaywrightService();
    const result = await playwrightService.youtubeSearch(query);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}