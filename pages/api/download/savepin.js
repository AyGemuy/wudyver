// pages/api/savepin.js

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function pindl(url) {
    try {
        const response = await fetch(`https://www.savepin.app/download.php?url=${url}&lang=en&type=redirect`);
        const body = await response.text();
        const $ = cheerio.load(body);
        let mediaType = '';
        const imageTable = $('table').has('tr:contains("Quality")').first();
        const videoTable = $('table').has('tr:contains("480p")').first();
        const results = [];

        if (imageTable.length) {
            imageTable.find('tr').each((index, element) => {
                const quality = $(element).find('.video-quality').text();
                const format = $(element).find('td:nth-child(2)').text();
                const downloadLink = $(element).find('a').attr('href');
                if (quality) {
                    results.push({ quality, format, media: 'https://www.savepin.app' + downloadLink });
                }
            });
        } else if (videoTable.length) {
            videoTable.find('tr').each((index, element) => {
                const quality = $(element).find('.video-quality').text();
                const format = $(element).find('td:nth-child(2)').text();
                const downloadLink = $(element).find('a').attr('href');
                if (quality) {
                    results.push({ quality, format, media: 'https://www.savepin.app' + downloadLink });
                }
            });
        } else {
            return { message: 'Tidak ada tabel media ditemukan.' };
        }

        return { results };
    } catch (error) {
        return { error: 'Error fetching media data: ' + error.message };
    }
}

export default async function handler(req, res) {
    const { url } = req.method === "GET" ? req.query : req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL query parameter is required.' });
    }

    try {
        const result = await pindl(url);
        return res.status(200).json({ result });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error processing request: ' + error.message });
    }
}
