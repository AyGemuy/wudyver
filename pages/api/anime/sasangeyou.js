import axios from 'axios';
import * as cheerio from 'cheerio';

class SasangeyouScraper {
  async search(query) {
    const searchUrl = `https://sasangeyou.fun/?s=${query}`;
    try {
      const { data } = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        },
      });
      const $ = cheerio.load(data);
      const searchResults = [];
      $('.bsx').each((_, element) => {
        const title = $(element).find('.tt').text().trim();
        const link = $(element).find('a').attr('href');
        const thumb = $(element).find('img').attr('src');
        searchResults.push({ title, link, thumb });
      });
      return searchResults;
    } catch (error) {
      console.error('Error:', error.message);
      return [];
    }
  }

  async latest() {
    const url = 'https://sasangeyou.fun/manga/?order=update';
    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        },
      });
      const $ = cheerio.load(data);
      const mangaList = [];
      $('.bsx').each((_, element) => {
        const title = $(element).find('.tt').text().trim();
        const link = $(element).find('a').attr('href');
        const thumb = $(element).find('img').attr('src');
        mangaList.push({ title, link, thumb });
      });
      return mangaList;
    } catch (error) {
      console.error('Error:', error.message);
      return [];
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req;
  const scraper = new SasangeyouScraper();

  try {
    if (query.type === 'search' && query.query) {
      const result = await scraper.search(query.query);
      return res.status(200).json(result);
    } else if (query.type === 'latest') {
      const result = await scraper.latest();
      return res.status(200).json(result);
    } else {
      return res.status(400).json({ error: 'Invalid query type or missing parameters' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
