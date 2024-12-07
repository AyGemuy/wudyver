// pages/api/yt.js

import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Mengambil parameter URL dari query string
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  const apiUrl = 'https://snap-video3.p.rapidapi.com/download';
  const headers = {
    'x-rapidapi-key': '6c89b60d54mshbd7129398394e6ap1ea9cajsn74a5d4e18244',
    'x-rapidapi-host': 'snap-video3.p.rapidapi.com',
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const body = new URLSearchParams({
    url: url,
  });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: body,
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Menyusun data media yang dikembalikan dari API
    const medias = data.medias
      ? data.medias.map((media) => ({
          url: media.url || 'No URL',
          quality: media.quality || 'Unknown Quality',
          extension: media.extension || 'Unknown Extension',
          size: media.size || 'Unknown Size',
          formattedSize: media.formattedSize || 'Unknown Formatted Size',
          videoAvailable: media.videoAvailable !== undefined ? media.videoAvailable : 'Unknown',
          audioAvailable: media.audioAvailable !== undefined ? media.audioAvailable : 'Unknown',
          chunked: media.chunked !== undefined ? media.chunked : 'Unknown',
          cached: media.cached !== undefined ? media.cached : 'Unknown',
        }))
      : [];

    // Mengirimkan respons JSON dengan data video
    return res.status(200).json({
      success: true,
      author: '@selxyz',
      result: {
        title: data.title || 'Unknown Title',
        thumbnail: data.thumbnail || 'No Thumbnail',
        duration: data.duration || 'Unknown Duration',
        source: 'youtube',
        medias: medias,
        sid: data.sid || null,
      },
    });
  } catch (error) {
    // Menangani error jika permintaan API gagal
    return res.status(500).json({ success: false, error: error.message });
  }
}
