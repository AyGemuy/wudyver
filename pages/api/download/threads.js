// File: pages/api/threads.js

import axios from 'axios';

export default async function handler(req, res) {

  const { link } = req.method === "GET" ? req.query : req.body;

  if (!link?.includes('threads.net')) {
    return res.status(400).json({ error: 'Etdaahhh, udah gede juga, yakali kudu dikasih tau mulu 🗿' });
  }

  const ret = (attempt) => new Promise(resolve => setTimeout(resolve, 1000 * attempt));

  const submit = async (attempt = 1) => {
    try {
      const { data } = await axios.get('https://threads.snapsave.app/api/action', {
        params: { url: link },
        headers: {
          'accept': 'application/json, text/plain, */*',
          'referer': 'https://threads.snapsave.app/',
          'user-agent': 'Postify/1.0.0'
        },
        timeout: 10000
      });

      if (data.status_code !== 0 || !data.items?.length) {
        throw new Error('Kagak ada media yang bisa buat di download bree 😝');
      }

      return data;
    } catch (error) {
      if (error.response?.status === 500 && attempt < 3) {
        console.log(`Yaaah gagal ${attempt} kali. Coba ulang dah...`);
        await ret(attempt);
        return submit(attempt + 1);
      }
      throw error;
    }
  };

  try {
    const data = await submit();

    const type = type => ({ GraphImage: 'Photo', GraphVideo: 'Video', GraphSidecar: 'Gallery' }[type] || type);

    return res.status(200).json({
      postInfo: {
        id: data.postinfo.id,
        username: data.postinfo.username,
        avatarUrl: data.postinfo.avatar_url,
        mediaTitle: data.postinfo.media_title,
        type: type(data.postinfo.__type)
      },
      media: data.items.map(item => ({
        type: type(item.__type),
        id: item.id,
        url: item.url,
        width: item.width,
        height: item.height,
        ...(item.__type === 'GraphVideo' && {
          thumbnailUrl: item.display_url,
          videoUrl: item.video_url,
          duration: item.video_duration
        })
      }))
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ error: error.message });
  }
}
