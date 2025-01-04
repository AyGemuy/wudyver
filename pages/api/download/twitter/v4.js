// pages/api/download.js
import axios from 'axios';
import * as cheerio from 'cheerio';

const x2twit = {
  dl: async (link) => {
    if (!link || typeof link !== 'string' || !link.startsWith('https://twitter.com/')) {
      throw new Error('Etdaahhh, udah gede juga, yakali kudu dikasih tau mulu 🗿');
    }

    try {
      const { data } = await axios.post('https://x2twitter.com/api/ajaxSearch', 
        `q=${encodeURIComponent(link)}&lang=en`,
        {
          headers: {
            'accept': '*/*',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'origin': 'https://x2twitter.com',
            'referer': 'https://x2twitter.com/en',
            'user-agent': 'Postify/1.0.0',
          }
        }
      );

      const $ = cheerio.load(data.data);
      const media = {};

      $('.photo-list .download-items, .tw-video').each((_, el) => {
        const $el = $(el);
        const type = $el.hasClass('download-items') ? 'photo' : 'video';
        const item = {
          title: $el.find('h3').text().trim(),
          thumbnail: $el.find('img').attr('src'),
          dlink: $el.find('a[href^="https://dl.snapcdn.app/get"]').map((_, link) => {
            const $link = $(link);
            return {
              quality: $link.text().includes('MP3') ? 'MP3' : 
                       $link.text().includes('Photo') ? 'Photo' : 
                       `MP4 (${$link.text().match(/\((\d+p)\)/)?.[1].toUpperCase() || 'Kagak tau 💃'})`,
              url: $link.attr('href')
            };
          }).get()
        };
        if (!media[type]) media[type] = [];
        media[type].push(item);
      });

      if (Object.keys(media).length === 0) {
        throw new Error('Kagak ada media yang bisa buat di download bree 😝');
      }

      return media;
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }
};

export default async function handler(req, res) {
    const { link } = req.method === "GET" ? req.query : req.body;
    if (!link) {
      return res.status(400).json({ error: 'Link query parameter is required' });
    }

    try {
      const media = await x2twit.dl(link);
      return res.status(200).json(media);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
}
