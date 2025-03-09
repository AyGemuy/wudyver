import axios from 'axios';

class SoundCloudDownloader {
    constructor() {
        this.apiUrl = 'https://api.downloadsound.cloud/track';
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json;charset=utf-8",
            "User-Agent": "Mozilla/5.0 (Linux; Android 6.0.1; SM-J500G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Mobile Safari/537.36"
        };
    }

    async downloadTrack(url) {
        try {
            const { data } = await axios.post(this.apiUrl, { url }, { headers: this.headers });
            if (!data.url) {
                return {
                    status: false
                };
            }
            return {
                status: true,
                data
            };
        } catch (e) {
            console.log(e);
            return {
                status: false
            };
        }
    }
}

export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new SoundCloudDownloader();
    const result = await downloader.downloadTrack(url);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}