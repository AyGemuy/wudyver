import axios from "axios";
class SoundCloud {
  constructor() {
    this.cache = {
      version: "",
      id: ""
    };
  }
  async getClientID() {
    try {
      const {
        data: html
      } = await axios.get("https://soundcloud.com/");
      const version = html.match(/<script>window\.__sc_version="(\d{10})"<\/script>/)?.[1];
      if (!version) return;
      if (this.cache.version === version) return this.cache.id;
      const scriptMatches = [...html.matchAll(/<script.*?src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+)"/g)];
      for (const [, scriptUrl] of scriptMatches) {
        const {
          data: js
        } = await axios.get(scriptUrl);
        const idMatch = js.match(/client_id:"([a-zA-Z0-9]{32})"/);
        if (idMatch) {
          this.cache.version = version;
          this.cache.id = idMatch[1];
          return idMatch[1];
        }
      }
    } catch (err) {
      console.error("Gagal ambil client_id:", err.message);
    }
  }
  async download(url) {
    try {
      if (!url.includes("soundcloud.com")) return {
        error: "link.invalid"
      };
      const client_id = await this.getClientID();
      if (!client_id) return {
        error: "client_id.not_found"
      };
      const resolveUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${client_id}`;
      const {
        data: info
      } = await axios.get(resolveUrl);
      if (!info.media || !info.media.transcodings) return {
        error: "media.not_found"
      };
      const streamInfo = info.media.transcodings.find(x => x.format.protocol === "progressive");
      if (!streamInfo) return {
        error: "no_downloadable_audio"
      };
      const streamUrl = `${streamInfo.url}?client_id=${client_id}`;
      const {
        data: streamData
      } = await axios.get(streamUrl);
      return {
        title: info.title,
        author: info.user?.username || "unknown",
        audio_url: streamData.url,
        duration: Math.floor(info.duration / 1e3) + " sec",
        thumbnail: info.artwork_url || null
      };
    } catch (e) {
      return {
        error: true,
        message: e.message
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
    const downloader = new SoundCloud();
    const result = await downloader.download(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}