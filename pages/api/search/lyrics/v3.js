import axios from 'axios';
import * as cheerio from 'cheerio';

const searchLyrics = async (song) => {
  try {
    const { data } = await axios.get(`https://www.lyrics.com/lyrics/${song}`);
    const $ = cheerio.load(data);

    const result = $('.best-matches .bm-case')
      .map((i, element) => {
        const title = $(element).find('.bm-label a').first().text();
        const artist = $(element).find('.bm-label a').last().text();
        const album = $(element).find('.bm-label').eq(1).text().trim().replace(/\s+/g, ' ');
        const imageUrl = $(element).find('.album-thumb img').attr('src');
        const link = $(element).find('.bm-label a').first().attr('href');

        return {
          title,
          artist,
          album,
          imageUrl,
          link: `https://www.lyrics.com${link}`,
        };
      })
      .get();

    return result;
  } catch (error) {
    console.error(`Error fetching search results: ${error.message}`);
    throw new Error('Failed to fetch search results.');
  }
};

const getLyrics = async (url) => {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const artistImage = $('#featured-artist-avatar img').attr('src');
    const about = $('.artist-meta .bio').text().trim();
    const year = $('.lyric-details dt:contains("Year:") + dd').text().trim();
    const playlists = $('.lyric-details dt:contains("Playlists") + dd a').text().trim();
    const lyrics = $('#lyric-body-text').text().trim();

    return { artistImage, about, year, playlists, lyrics };
  } catch (error) {
    console.error(`Error fetching lyrics: ${error.message}`);
    throw new Error('Failed to fetch lyrics.');
  }
};

export default async function handler(req, res) {
  const { query, method } = req;

  try {
    if (method === 'GET') {
      const { action, song, url } = query;

      if (action === 'search' && song) {
        const results = await searchLyrics(song);
        res.status(200).json(results);
      } else if (action === 'getLyrics' && url) {
        const lyricsData = await getLyrics(url);
        res.status(200).json(lyricsData);
      } else {
        res.status(400).json({ error: 'Invalid query parameters.' });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
