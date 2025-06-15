import axios from "axios";
import apiConfig from "@/configs/apiConfig";
const runPlaywrightCode = async code => {
  try {
    const url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    const headers = {
      accept: "*/*",
      "content-type": "application/json",
      "user-agent": "Postify/1.0.0"
    };
    const data = {
      code: code,
      language: "javascript"
    };
    const response = await axios.post(url, data, {
      headers: headers
    });
    return response.data;
  } catch (error) {
    console.error("Error running playwright code:", error);
    throw error;
  }
};
const iask = async query => {
  const code = `const { chromium } = require('playwright');

async function iask(query) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(\`https://iask.ai/?mode=question&q=\${query}\`);
    await page.waitForSelector('.mt-6.md\\\\:mt-4.w-full.p-px.relative.self-center.flex.flex-col.items-center.results-followup', { timeout: 0 });

    const outputDiv = await page.$('#output');

    if (!outputDiv) {
      return { image: [], answer: null, sources: [], videoSource: [], webSearch: [] };
    }

    const answerElement = await outputDiv.$('#text');
    const answerText = await answerElement.evaluate(el => el.innerText);
    const [answer, sourcesText] = answerText.split('Top 3 Authoritative Sources Used in Answering this Question');
    const cleanedAnswer = answer.replace(/According to Ask AI & Question AI www\\.iAsk\\.ai:\\s*/, '').trim();
    const sources = sourcesText ? sourcesText.split('\\n').filter(source => source.trim() !== '') : [];

    const imageElements = await outputDiv.$$('img');
    const images = await Promise.all(imageElements.map(async (img) => {
      return await img.evaluate(img => img.src);
    }));

    const videoSourceDiv = await page.$('#related-videos');
    const videoSources = [];
    if (videoSourceDiv) {
      const videoElements = await videoSourceDiv.$$('a');
      for (const videoElement of videoElements) {
        const videoLink = await videoElement.evaluate(el => el.href);
        const videoTitle = await videoElement.$eval('h3', el => el.innerText).catch(() => 'No title found');
        const videoThumbnail = await videoElement.$eval('img', el => el.src).catch(() => 'No thumbnail found');

        if (videoTitle !== 'No title found' && videoThumbnail !== 'No thumbnail found') {
          videoSources.push({ title: videoTitle, link: videoLink, thumbnail: videoThumbnail });
        }
      }
    }

    const webSearchDiv = await page.$('#related-links');
    const webSearchResults = [];
    if (webSearchDiv) {
      const linkElements = await webSearchDiv.$$('a');
      for (const linkElement of linkElements) {
        const linkUrl = await linkElement.evaluate(el => el.href);
        const linkTitle = await linkElement.evaluate(el => el.innerText);
        const linkImage = await linkElement.$eval('img', el => el.src).catch(() => 'No image found');
        const linkDescription = await linkElement.evaluate(el => el.nextElementSibling.innerText).catch(() => 'No description found');

        if (linkTitle && linkUrl) {
          webSearchResults.push({
            title: linkTitle,
            link: linkUrl,
            image: linkImage,
            description: linkDescription
          });
        }
      }
    }

    const src = sources.map(source => source.trim());
    const result = { image: images, answer: cleanedAnswer, sources: src, videoSource: videoSources, webSearch: webSearchResults };
    return JSON.stringify(result, null, 2);

  } catch (error) {
    console.error('Error fetching data:', error);
    return { image: [], answer: null, sources: [], videoSource: [], webSearch: [] };
  } finally {
    await browser.close();
  }
}

iask(\`${query}\`).then(a => console.log(a));`;
  const {
    output
  } = await runPlaywrightCode(code.trim());
  return JSON.parse(output);
};
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Query parameter is required"
    });
  }
  try {
    const result = await iask(query);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to fetch answer from iask.ai"
    });
  }
}