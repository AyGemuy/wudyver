import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

class Bilibili {
  async getCookies() {
    try {
      const jar = new CookieJar();
      const client = wrapper(axios.create({ jar }));
      await client.get('https://www.bilibili.tv/');
      return await jar.getCookies('https://www.bilibili.tv/');
    } catch (error) {
      console.log('Gagal mendapatkan kuki, coba input manual 🌝');
      return null;
    }
  }

  async getInfo(link) {
    try {
      const videoId = link.split('/').pop();
      const cookies = await this.getCookies();
      if (!cookies) throw new Error('Kuki tidak ditemukan');
      
      const headers = {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'id-MM',
        cookie: cookies.join('; '),
        origin: 'https://www.bilibili.tv',
        priority: 'u=1, i',
        referer: `https://www.bilibili.tv/video/${videoId}`,
        'user-agent': 'Postify/1.0.0',
      };
      
      const { data } = await axios.get(
        `https://api.bilibili.tv/intl/gateway/web/playurl?s_locale=id_ID&platform=html5_a&aid=${videoId}&qn=64&type=0&device=wap&tf=0&spm_id=bstar-web.ugc-video-detail.0.0&from_spm_id=`,
        { headers }
      );
      
      return data.data.playurl;
    } catch (error) {
      console.log('Terjadi kesalahan:', error.message);
      return null;
    }
  }
}

export default async function handler(req, res) {
  const bilibili = new Bilibili();
  
  try {
    const { link } = req.method === 'GET' ? req.query : req.body;
    if (!link) return res.status(400).json({ error: 'Link diperlukan' });

    const playUrl = await bilibili.getInfo(link);
    if (playUrl) return res.status(200).json({ playUrl });
    return res.status(500).json({ error: 'Gagal mengambil video' });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ error: 'Kesalahan server' });
  }
}

