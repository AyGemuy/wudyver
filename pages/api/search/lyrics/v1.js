import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const GENIUS_API_URL = 'https://api.genius.com';
const GENIUS_ACCESS_TOKEN = 'L0BY-i4ZVi0wQ53vlvm2zucqjHTuLbHv--YgjxJoN0spnEIhb5swTr_mWlQ6Ye-F';

const headers = {
    'Authorization': `Bearer ${GENIUS_ACCESS_TOKEN}`,
    'User-Agent': 'apitester.org Android/7.5(641)'
};

function logs(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
}

async function searchSong(query) {
    const url = new URL('/search', GENIUS_API_URL);
    url.searchParams.append('q', query);

    try {
        const response = await fetch(url.toString(), { headers });
        if (!response.ok) {
            throw logs(`❌ Error: ${response.status}`, response.status);
        }
        const data = await response.json();
        return data.response.hits;
    } catch (error) {
        throw logs(`❌ Error: ${error.message}`, 'NETWORK_ERROR');
    }
}

async function getLyrics(songUrl) {
    try {
        const response = await fetch(songUrl);
        if (!response.ok) {
            throw logs(`❌ Error: ${response.status}`, response.status);
        }
        const html = await response.text();
        const $ = cheerio.load(html);
        let lyrics = '';

        $('[class^="Lyrics__Container-"]').each((index, element) => {
            $(element).find('br').replaceWith('\n');
            lyrics += $(element).html()
                .replace(/<(?!\/?i>|\/?b>)[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                + '\n';
        });

        lyrics = lyrics
            .split('\n')
            .map(line => line.trim())
            .filter(line => line !== '')
            .join('\n')
            .replace(/\[/g, '\n\n[')
            .replace(/\]\n/g, ']\n')
            .replace(/\n{3,}/g, '\n\n');

        return lyrics.trim();
    } catch (error) {
        throw logs('❌ Error', 'LYRICS_ERROR');
    }
}

async function getSongLyrics(query) {
    try {
        const searchResults = await searchSong(query);
        if (searchResults.length === 0) {
            return { error: "Lirik nya gak ada 🌝" };
        }

        const song = searchResults[0].result;
        const lyrics = await getLyrics(song.url);

        return {
            title: song.title,
            artist: song.primary_artist.name,
            lyrics,
            url: song.url,
            thumbnailUrl: song.song_art_image_thumbnail_url
        };
    } catch (error) {
        return { error: error.message };
    }
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed, gunakan GET.' });
    }

    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query tidak disediakan.' });
    }

    try {
        const result = await getSongLyrics(query);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
