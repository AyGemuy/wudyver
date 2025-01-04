import axios from 'axios';

class YTJAR {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://youtube-video-download-info.p.rapidapi.com/dl';
  }

  async download(url, type = 'mp3') {
    const downloadUrl = type === 'mp3'
      ? 'https://youtube-mp3-download1.p.rapidapi.com/dl'
      : this.baseUrl;

    try {
      const response = await axios.get(downloadUrl, {
        params: { id: url },
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': type === 'mp3'
            ? 'youtube-mp3-download1.p.rapidapi.com'
            : 'youtube-video-download-info.p.rapidapi.com',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch stream');
    }
  }
}

const jarKey = '35c9046f7cmshd2db25369e25f75p1cf84ejsn4d95e7ba9240';

export default async function handler(req, res) {
  const ytdl = new YTJAR(jarKey);
  const { url, type = 'mp3' } = req.method === 'GET' ? req.query : req.body;

  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  try {
    const streamResponse = await ytdl.download(url, type);
    return res.status(200).json(streamResponse);
  } catch (error) {
    return res.status(500).json({ error: 'Error fetching stream' });
  }
}
