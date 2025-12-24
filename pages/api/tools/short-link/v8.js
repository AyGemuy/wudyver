import axios from "axios";
class UrlShortener {
  constructor() {
    this.hosts = {
      "da.gd": this._daGD,
      "v.gd": this._vGD,
      "tinu.be": this._tinuBe,
      "tinyurl.com": this._tinyUrl,
      "spoo.me": this._spooMe,
      "spoo-emoji": this._spooEmoji
    };
    console.log("UrlShortener class diinisialisasi.");
  }
  _genHeader(customHeaders = {}) {
    const baseHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9"
    };
    return {
      ...baseHeaders,
      ...customHeaders
    };
  }
  async generate({
    host,
    url,
    name,
    ...rest
  }) {
    console.log("Proses generate dimulai...");
    try {
      const hostKeys = Object.keys(this.hosts);
      if (host && !this.hosts[host]) {
        throw new Error(`Host tidak valid. Silakan gunakan salah satu dari host berikut: ${hostKeys.join(", ")}`);
      }
      const selectedHost = host || hostKeys[Math.floor(Math.random() * hostKeys.length)];
      const customName = name ? name : `short_${Date.now()}`;
      console.log(`Menggunakan host: ${selectedHost}`);
      console.log(`URL asli: ${url}`);
      console.log(`Nama kustom: ${customName}`);
      const shortener = this.hosts[selectedHost];
      if (!shortener) {
        throw new Error("Host tidak valid atau tidak didukung.");
      }
      const result = await shortener.call(this, url, customName, rest);
      console.log(`Sukses! URL pendek: ${result}`);
      return result;
    } catch (error) {
      console.error("Terjadi kesalahan selama proses generate:", error.message);
      throw error;
    }
  }
  async _daGD(url, customName) {
    const endpoint = `https://da.gd/shorten?url=${encodeURIComponent(url)}&shorturl=${encodeURIComponent(customName)}`;
    const res = await axios.get(endpoint, {
      headers: this._genHeader()
    });
    return res?.data?.trim() || `https://da.gd/${customName}`;
  }
  async _vGD(url, customName) {
    const endpoint = `https://v.gd/create.php?format=json&url=${encodeURIComponent(url)}&shorturl=${encodeURIComponent(customName)}&logstats=1`;
    const res = await axios.get(endpoint, {
      headers: this._genHeader()
    });
    return res?.data?.shorturl;
  }
  async _tinuBe(url, customName) {
    const payload = JSON.stringify([{
      longUrl: url,
      urlCode: customName
    }]);
    const res = await axios.post("https://tinu.be/en", payload, {
      headers: this._genHeader({
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "next-action": "74b2f223fe2b6e65737e07eeabae72c67abf76b2"
      })
    });
    const code = res?.data?.data?.urlCode || customName;
    return `https://tinu.be/${code}`;
  }
  async _tinyUrl(url, customName) {
    const endpoint = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}&alias=${encodeURIComponent(customName)}`;
    const res = await axios.get(endpoint, {
      headers: this._genHeader()
    });
    return res?.data?.trim() || `https://tinyurl.com/${customName}`;
  }
  async _spooMe(url, customName) {
    const endpoint = `https://spoo.me/?alias=${encodeURIComponent(customName)}&url=${encodeURIComponent(url)}`;
    const res = await axios.post(endpoint, null, {
      headers: this._genHeader({
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      })
    });
    return res?.data?.short_url;
  }
  async _spooEmoji(url, _, {
    emojis
  }) {
    const emojiList = emojis || "🚀✨";
    console.log(`Menggunakan emoji: ${emojiList}`);
    const endpoint = `https://spoo.me/emoji?emojies=${encodeURIComponent(emojiList)}&url=${encodeURIComponent(url)}`;
    const res = await axios.post(endpoint, null, {
      headers: this._genHeader({
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      })
    });
    return res?.data?.short_url;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Paramenter 'url' dibutuhkan."
    });
  }
  try {
    const shortener = new UrlShortener();
    const response = await shortener.generate(params);
    return res.status(200).json({
      success: true,
      result: response
    });
  } catch (error) {
    res.status(400).json({
      error: error.message || "Internal Server Error"
    });
  }
}