import axios from 'axios';
import UserAgent from 'fake-useragent';

class YtsavetubeApi {
  constructor({ cdnNumber = 53, type = 'video', quality = '720' }) {
    this.cdnNumber = cdnNumber || Math.floor(Math.random() * 11) + 51;
    this.base = `https://cdn${this.cdnNumber}.savetube.su`;
    this._userAgent = UserAgent();
    this.type = type;
    this.quality = quality;
  }

  async getVideo(id) {
    const infoUrl = `${this.base}/info`;
    const downloadUrl = `${this.base}/download`;

    let info;
    while (!info) {
      try {
        const response = await axios.post(infoUrl, { url: `https://www.youtube.com/watch?v=${id}` }, { headers: { "User-Agent": this._userAgent } });
        info = response.data;
      } catch (err) {
        console.error(err);
      }
    }

    if (!info?.data?.key) return { error: "Failed to fetch video info", base: this.base };

    let download;
    while (!download) {
      try {
        const response = await axios.post(downloadUrl, { key: info.data.key, downloadType: this.type, quality: this.quality }, { headers: { "User-Agent": this._userAgent } });
        download = response.data;
      } catch (err) {
        console.error(err);
      }
    }

    return { status: 'success', title: info.data.title, duration: info.data.durationLabel, thumbnail: info.data.thumbnail, downloadUrl: download.data.downloadUrl, info, download };
  }
}

const getId = (url) => url.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\/?\?v=|\/embed\/|\/)([^\s&\?\/\#]+)/)[1];

export default async function handler(req, res) {
  const { url, cdn = '53', type = 'video', quality = '720' } = req.method === "GET" ? req.query : req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const videoId = getId(url);
    const api = new YtsavetubeApi({ cdnNumber: cdn, type: type, quality: quality });
    const result = await api.getVideo(videoId);

    if (result.status === 'success') {
      return res.status(200).json(result);
    } else {
      return res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to process the video' });
  }
}
