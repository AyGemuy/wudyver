import axios from 'axios';
import { createDecipheriv } from 'crypto';
import qs from 'qs';

class Tiktok {
    constructor() {
        this.host = "tiktok-video-no-watermark2.p.rapidapi.com";
        this.url = `https://${this.host}/`;
        this.enc = "oX3GRSuFy0KygR+2Mqh3EsMjwE9MnkmFlj705aHx8/1I05IzblqZ40vV0ZnqK0nBHCcmGdYFN13sCe2Fje5ZhQ==";
        this.salt = "hooyee";
        this._k = null;
    }

    /** Decrypt API Key */
    key() {
        if (this._k) return this._k;
        try {
            // Padding salt dengan '0' sampai 32 byte (ES6 padEnd)
            const k = Buffer.from(this.salt.padEnd(32, '0'));
            
            // Decrypt AES-256-ECB
            const d = createDecipheriv('aes-256-ecb', k, null).setAutoPadding(true);
            const b = Buffer.concat([
                d.update(Buffer.from(this.enc, 'base64')), 
                d.final()
            ]);
            
            return (this._k = b.toString());
        } catch (e) {
            throw new Error("Key Error");
        }
    }

    /** Download Video */
    async download({ url, ...opt }) {
        try {
            const { data } = await axios.post(this.url, qs.stringify({ url, hd: '0', ...opt }), {
                headers: { 
                    'content-type': 'application/x-www-form-urlencoded', 
                    'X-RapidAPI-Host': this.host, 
                    'X-RapidAPI-Key': this.key() 
                }
            });
            return data;
        } catch (e) {
            throw new Error(e.response ? `API ${e.response.status}` : e.message);
        }
    }
}


export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new Tiktok();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}