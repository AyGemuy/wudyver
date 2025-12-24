import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class FastDl {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
    };
  }
  async download(instagramUrl) {
    try {
      const payload = {
        code: `const { chromium } = require('playwright');

        (async () => {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();

            try {
                await page.goto('https://fastdl.app/en');
                await page.fill('#search-form-input', '${instagramUrl}');
                await page.click('.search-form__button');

                await page.waitForSelector('.loader-component', { timeout: 20000 });

                const message = await page.evaluate(() => document.querySelector('.loader-component__message')?.textContent || '');
                const type = message.split(' ').find(w => w.endsWith('.'))?.slice(0, -1) || 'post';

                await page.waitForSelector('.output-component__title', { timeout: 20000 });

                const result = await page.evaluate((type) => {
                    switch (type) {
                        case 'post':
                        case 'reel':
                        case 'stories':
                        case 'story': {
                            const container = document.querySelector('.output-list__list');
                            return {
                                posts: container ? Array.from(container.querySelectorAll('.output-list__item')).map(item => ({
                                    thumb: item.querySelector('img')?.src || null,
                                    url: item.querySelector('a.button__download')?.href || null,
                                    caption: document.querySelector('.output-list__caption p')?.innerText || null,
                                    likes: document.querySelector('.output-list__info-like')?.innerText.trim() || null,
                                    time: document.querySelector('.output-list__info-time')?.title || null,
                                })) : [],
                                html: container?.outerHTML || null
                            };
                        }

                        case 'profile': {
                            const userInfo = document.querySelector('.output-profile .user-info');
                            return {
                                profile: {
                                    username: userInfo?.querySelector('.user-info__username-text')?.innerText || 'Unknown User',
                                    fullName: userInfo?.querySelector('.user-info__full-name')?.innerText || 'No Full Name',
                                    biography: userInfo?.querySelector('.user-info__biography')?.innerText || 'No Biography',
                                    avatar: userInfo?.querySelector('.avatar__image')?.src || 'No Avatar',
                                    profileUrl: document.querySelector('.output-profile a')?.href || 'No Profile Link',
                                    stats: Array.from(userInfo?.querySelectorAll('.stats__item') || []).map(item => ({
                                        value: item.querySelector('.stats__value')?.innerText || '0',
                                        name: item.querySelector('.stats__name')?.innerText || 'Unknown Stat'
                                    })),
                                    totalPosts: userInfo?.querySelector('.stats__item:nth-child(1) .stats__value')?.innerText || '0',
                                    isBusinessAccount: !!document.querySelector('.user-info__business-badge'),
                                    media: Array.from(document.querySelectorAll('.profile-media-list__item')).map(item => ({
                                        type: item.querySelector('.media-content')?.classList.contains('media-content--post') ? 'reels' : 'post',
                                        caption: item.querySelector('.media-content__caption')?.innerText || 'No Caption',
                                        imageUrl: item.querySelector('.media-content__image')?.src || 'No Image',
                                        videoUrl: item.querySelector('.button__download')?.href || 'No Video',
                                        likes: item.querySelector('.media-content__meta-like')?.innerText.replace(/\D/g, '') || '0',
                                        comments: item.querySelector('.media-content__meta-comment')?.innerText.replace(/\D/g, '') || '0',
                                        time: item.querySelector('.media-content__meta-time')?.getAttribute('title') || item.querySelector('.media-content__meta-time')?.innerText || 'Unknown Time',
                                        duration: item.querySelector('.media-content__duration')?.innerText || 'No Duration'
                                    }))
                                },
                                html: userInfo?.outerHTML || null
                            };
                        }

                        default: {
                            const container = document.querySelector('.output-list__list');
                            return {
                                posts: container ? Array.from(container.querySelectorAll('.output-list__item')).map(item => ({
                                    thumb: item.querySelector('img')?.src || null,
                                    url: item.querySelector('a.button__download')?.href || null,
                                    caption: document.querySelector('.output-list__caption p')?.innerText || null,
                                    likes: document.querySelector('.output-list__info-like')?.innerText.trim() || null,
                                    time: document.querySelector('.output-list__info-time')?.title || null,
                                })) : [],
                                html: container?.outerHTML || null
                            };
                        }
                    }
                }, type);

                console.log(JSON.stringify({ type, ...result }, null, 2));
            } catch (error) {
                console.error('Terjadi kesalahan:', error);
            } finally {
                await browser.close();
            }
        })();`,
        language: "javascript"
      };
      const response = await axios.post(this.url, payload, {
        headers: this.headers
      });
      const output = JSON.parse(response.data.output);
      console.log("Parsed Output:", output);
      return output;
    } catch (error) {
      console.error("Error fetching data:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL diperlukan."
      });
    }
    const fastdl = new FastDl();
    const result = await fastdl.download(url);
    return res.status(200).json({
      result: result
    });
  } catch (err) {
    res.status(500).json({
      message: "Terjadi kesalahan.",
      error: err.message
    });
  }
}