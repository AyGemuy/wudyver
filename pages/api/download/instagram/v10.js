import axios from "axios";
const runPlaywrightCode = async (lang, code) => {
  try {
    const url = "https://try.playwright.tech/service/control/run";
    const headers = {
      accept: "*/*",
      "content-type": "application/json",
      origin: "https://try.playwright.tech",
      referer: "https://try.playwright.tech/?l=playwright-test",
      "user-agent": "Postify/1.0.0"
    };
    const data = {
      code: code,
      language: lang || "javascript"
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
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    url
  } = method === "GET" ? req.query : req.body;
  if (method === "GET" || method === "POST") {
    try {
      const code = `const { chromium, devices } = require('playwright');
async function igdl(url) {
    const device = devices['iPhone 12'];
    const browser = await chromium.launch();
    const context = await browser.newContext({ ...device });
    const page = await context.newPage();
    await page.goto('https://igram.world');
    await page.fill('#search-form-input', \`${url}\`);
    await page.click('.search-form__button');
    await page.waitForTimeout(2000);
    const results = await page.evaluate(() => {
            const outputList = document.querySelector('.output-list');
            const items = Array.from(outputList.querySelectorAll('.output-list__item'));
            const images = [];
            const videos = [];
            items.forEach(item => {
                const imageElement = item.querySelector('.media-content__image');
                const imageUrl = imageElement ? imageElement.src : null;
                const downloadButton = item.querySelector('.button--filled.button__download');
                const videoUrl = downloadButton ? downloadButton.href : null;
                if (imageUrl) {
                    if (imageUrl.endsWith('.jpg') || imageUrl.endsWith('.png') || imageUrl.endsWith('.webp')) {
                        images.push(imageUrl);
                    }
                }
                if (videoUrl && !videoUrl.endsWith('.jpg') && !videoUrl.endsWith('.png') && !videoUrl.endsWith('.webp')) {
                    videos.push(videoUrl);
                }
            });
            const captionElement = outputList.querySelector('.output-list__caption p');
            const caption = captionElement ? captionElement.innerText : '';
            const comments = Array.from(outputList.querySelectorAll('.output-list__comments li')).map(comment => {
                const username = comment.querySelector('.output-list__comments-username a').innerText;
                const text = comment.querySelector('p:not(.output-list__comments-username)').innerText;
                return {
                    username,
                    text
                };
            });
            const uploadInfo = outputList.querySelector('.output-list__info');
            const uploadDate = uploadInfo.querySelector('.output-list__info-time').getAttribute('title');
            const likes = uploadInfo.querySelector('.output-list__info-like').innerText;
            const commentsCount = uploadInfo.querySelector('.output-list__info-comment').innerText;
            return {
                images,
                videos,
                caption,
                comments,
                uploadDate,
                likes,
                commentsCount
            };
        });
    console.log(JSON.stringify(results, null, 2));
    await browser.close();
}
igdl()`;
      const result = await runPlaywrightCode("javascript", code);
      return res.status(200).json({
        result: result
      });
    } catch (error) {
      console.error("Error in API handler:", error);
      return res.status(500).json({
        error: "Internal Server Error"
      });
    }
  } else {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}