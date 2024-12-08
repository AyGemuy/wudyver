import axios from 'axios';
import * as cheerio from 'cheerio';

class Otakupoi {
  constructor(url) {
    this.url = url;
  }

  async fetchPage(url) {
    try {
      const { data } = await axios.get(url);
      return data;
    } catch (error) {
      throw new Error('Failed to fetch the page: ' + error.message);
    }
  }

  async scrapeOngoingAnime(type) {
    const baseUrl = 
      type === 'neonime' ? 'https://otakupoi.org/neonime/ongoing/' :
      type === 'kusonime' ? 'https://otakupoi.org/kusonime/ongoing/' :
      type === 'maxnime' ? 'https://otakupoi.org/maxnime/ongoing/' :
      type === 'meownime' ? 'https://otakupoi.org/meownime/ongoing/' :
      type === 'oplovers' ? 'https://otakupoi.org/oplovers/ongoing/' :
      'https://otakupoi.org/ongoing/';  // Default URL if type is not recognized

    const pageContent = await this.fetchPage(baseUrl);
    const $ = cheerio.load(pageContent);
    const animeList = [];

    $('.bg-white.shadow.xrelated.relative').each((index, element) => {
      const title = $(element).find('.titlelist.tublok').text().trim();
      const episode = $(element).find('.eplist').text().trim();
      const rating = $(element).find('.starlist').text().trim();
      const imageUrl = $(element).find('img').attr('src');
      const animeUrl = $(element).find('a').attr('href');
      if (title && episode && rating && imageUrl && animeUrl) {
        animeList.push({ title, episode, rating, imageUrl, animeUrl });
      }
    });

    return animeList;
  }

  async searchAnime(query, type) {
    const searchUrl = 
      type === 'neonime' ? `https://otakupoi.org/neonime/search/?q=${encodeURIComponent(query)}` :
      type === 'kusonime' ? `https://otakupoi.org/kusonime/search/?q=${encodeURIComponent(query)}` :
      type === 'maxnime' ? `https://otakupoi.org/maxnime/search/?q=${encodeURIComponent(query)}` :
      type === 'meownime' ? `https://otakupoi.org/meownime/search/?q=${encodeURIComponent(query)}` :
      type === 'oplovers' ? `https://otakupoi.org/oplovers/search/?q=${encodeURIComponent(query)}` :
      `https://otakupoi.org/search/?q=${encodeURIComponent(query)}`;  // Default search URL

    const pageContent = await this.fetchPage(searchUrl);
    const $ = cheerio.load(pageContent);
    const searchResults = [];

    $('.bg-white.shadow.xrelated.relative').each((index, element) => {
      const title = $(element).find('.titlelist.tublok').text().trim();
      const episode = $(element).find('.eplist').text().trim();
      const rating = $(element).find('.starlist').text().trim();
      const imageUrl = $(element).find('img').attr('src');
      const animeUrl = $(element).find('a').attr('href');
      if (title && episode && rating && imageUrl && animeUrl) {
        searchResults.push({ title, episode, rating, imageUrl, animeUrl });
      }
    });
    return searchResults;
  }

  async fetchAnimeDetail(animeUrl) {
    const pageContent = await this.fetchPage(animeUrl);
    const $ = cheerio.load(pageContent);
    const title = $('h1.xptitle.center').text().trim();
    const synopsis = $('.boltab h2').next('div').text().trim();
    const episodes = [];
    
    $('#eps .othereps').each((i, elem) => {
      episodes.push({
        title: $(elem).text().trim(),
        link: $(elem).attr('href')
      });
    });

    const genre = $('.tablist').eq(1).find('a').map((i, elem) => $(elem).text()).get();
    const score = $('.tablist').first().find('span').text().trim();

    return { title, synopsis, episodes, genre, score };
  }
}

export async function handler(req, res) {
  const { action, query, animeUrl, type } = req.query;
  const otakupoi = new Otakupoi('https://otakupoi.org/ongoing/');
  
  try {
    if (action === 'search' && query) {
      const searchResults = await otakupoi.searchAnime(query, type);
      res.status(200).json(searchResults);
    } else if (action === 'detail' && animeUrl) {
      const animeDetail = await otakupoi.fetchAnimeDetail(animeUrl);
      res.status(200).json(animeDetail);
    } else if (action === 'ongoing') {
      const ongoingAnime = await otakupoi.scrapeOngoingAnime(type);
      res.status(200).json(ongoingAnime);
    } else {
      res.status(400).json({ error: 'Invalid action or missing query parameters' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
