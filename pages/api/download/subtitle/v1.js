import axios from "axios";
import CryptoJS from "crypto-js";
class Downsub {
  constructor() {
    this.baseURL = "https://get.downsub.com/";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://downsub.com",
      referer: "https://downsub.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.format = {
      stringify: function(cipherParams) {
        const e = {
          ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64)
        };
        if (cipherParams.iv) e.iv = cipherParams.iv.toString();
        if (cipherParams.salt) e.s = cipherParams.salt.toString();
        return JSON.stringify(e);
      },
      parse: function(jsonString) {
        const e = JSON.parse(jsonString);
        const n = CryptoJS.lib.CipherParams.create({
          ciphertext: CryptoJS.enc.Base64.parse(e.ct)
        });
        if (e.iv) n.iv = CryptoJS.enc.Hex.parse(e.iv);
        if (e.s) n.salt = CryptoJS.enc.Hex.parse(e.s);
        return n;
      }
    };
    this.pubKey = "zthxw34cdp6wfyxmpad38v52t3hsz6c5";
    this.platform = [{
      name: "Youtube",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:youtu\.be\/|youtube\.com\/(?:(?:watch|live)?\?(?:.*&)?v(?:i)?=|(?:embed|v|vi|user|shorts|live)\/))([^\?&\"'>]+)(?:(?:&|.+)?list=([a-zA-Z0-9_-]+))?/
    }, {
      name: "VIU All",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:viu\.com\/[a-zA-Z0-9_\/-]+\/video-[a-zA-Z0-9_\/-]+)(?:-([0-9]+))(?:.+playlist-([0-9]+))?/
    }, {
      name: "VIU",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:viu\.com\/ott\/)(?:[a-zA-Z-\/]+)(?:vod\/([0-9]+))/
    }, {
      name: "VLive",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:vlive\.tv\/(?:video\/|embed\/|post\/[0-9]-))([0-9]+)/
    }, {
      name: "Viki",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:viki\.com\/videos\/([a-zA-Z0-9]+))/
    }, {
      name: "Dailymotion",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:(?:dai\.ly\/|dailymotion\.com\/(?:video\/))([a-zA-Z0-9]+))/
    }, {
      name: "Vimeo",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:player\.)?(?:vimeo\.com\/)(?:video\/)?([0-9]+)/
    }, {
      name: "Ondemandkorea",
      regex: /^(?:https?:\/\/)?(?:www\.)?ondemandkorea\.com([a-zA-Z0-9-\/]+)\?contentId=([0-9]+)/
    }, {
      name: "TED",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.|embed\.)?(?:ted\.com\/talks\/([a-zA-Z0-9-_]+))/
    }, {
      name: "TV.Naver",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:tv\.naver\.com\/(?:v\/|embed\/)([0-9]+))/
    }, {
      name: "Line TV",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:tv\.line\.me\/(?:v\/|embed\/)([0-9]+))/
    }, {
      name: "Kocowa",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:kocowa\.com\/(?:(?:[a-z0-9_]+)\/(?:channel|media)\/)([0-9]+))/
    }, {
      name: "Drive",
      regex: /(?:https?:\/\/)?(?:[\w\-]+\.)*(?:drive|docs)\.google\.com\/(?:(?:folderview|open|uc)\?(?:[\w\-\%]+=[\w\-\%]*&)*id=|(?:folder|file|document|presentation)\/d\/|spreadsheet\/ccc\?(?:[\w\-\%]+=[\w\-\%]*&)*key=)([\w\-]{28,})/i
    }, {
      name: "Facebook",
      regex: /^(?:https?:\/\/)?(?:www\.|web\.|m\.)?(?:facebook\.com.*\/)(?:video(?:s)?|watch|story)(?:\.php)?(?:.+(?:=|\/)([0-9]+))/
    }, {
      name: "Vk",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:vk\.com\/(?:(?:video|feed|hd_kino_mania)\?z=)?(?:video_ext.php\?oid\=|video)([0-9_-]+)(?:&id=([0-9_-]+))?)/
    }, {
      name: "Bilibili",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:bilibili\.(?:tv|com)\/)(?:video\/)([a-zA-Z0-9-]+)/
    }, {
      name: "VIU TV",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:viu\.tv\/encore\/)([a-zA-Z0-9-]+)(?:\/([a-zA-Z0-9-]+))?/
    }, {
      name: "TubiTV",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:tubitv\.com\/(?:video|movies|tv-shows)\/([0-9]+))/
    }, {
      name: "Metopera",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.|embed\.|ondemand\.)?(?:metopera\.org\/performance\/detail\/([a-z0-9-]+))/
    }, {
      name: "WeTV",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:(?:wetv|iflix)\.(?:vip|com)\/)(?:[a-z-]+\/)?(?:play)(?:\?(?:&|.+)?(?:cid=|vid=)([a-z0-9]+)|\/([a-z0-9]+))/
    }, {
      name: "Iqiyi Int",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:iqiyi\.com\/intl|iq\.com)(?:\/play\/)(?:.+-)?([a-zA-Z0-9-]{10,})/
    }, {
      name: "Iqiyi Country",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:iqiyi\.com\/|iq\.com\/)(?:[a-z-]+)(?:\/play\/)(?:.+-)?([a-zA-Z0-9-]{10,})/
    }, {
      name: "LineTV TW",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:linetv\.tw\/(?:drama\/|embed\/)((?:[0-9]+)\/eps\/(?:[0-9]+)))/
    }, {
      name: "Brightcove",
      regex: /^(?:http(?:s)?:\/\/)?(?:(?:[a-z0-9-]+)\.brightcove(?:-services)?\.(?:com|net|services)\/(?:[^\?&\"'>]+)?\?videoId=([0-9]+))/
    }, {
      name: "Iflix",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:iflix\.com\/)(?:[a-z\/]+)(?:movie\/|episode\/|show\/|MOVIE\/|EPISODE\/|SHOW\/)([0-9]+)(?:.+id-downsub=([a-zA-Z0-9]+))?/
    }, {
      name: "Nrk.no",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:tv\.nrk\.no\/)([a-zA-Z0-9\/]+)/
    }, {
      name: "Zee5",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:zee5\.com\/)(?:[a-zA-Z0-9-\/]+)(0-[0-9]-[a-z0-9_-]+)/
    }, {
      name: "Dimsum",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:dimsum\.my\/)(?:[a-zA-Z0-9-_\/]+)(?:(?:media|series)-([0-9]+))(?:.+season-downsub=(season-[0-9]+))?/
    }, {
      name: "Altbalaji",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:altbalaji\.com\/)(?:(?:media|show)(?:[a-zA-Z0-9-\/]+)?\/([0-9]+))(?:.+season-downsub=([0-9]+))?/
    }, {
      name: "Voot",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:voot\.com\/)(?:[a-zA-Z0-9-_\/]+)(?:(?:[a-z0-9-]+)\/([0-9]+))/
    }, {
      name: "Hotstar",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:hotstar\.com\/)(?:.+?[\/-])?(\d{10}(?=\D*$))/
    }, {
      name: "Weverse",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:weverse\.io\/)([a-zA-Z0-9_-]{5,})/
    }, {
      name: "Tiktok",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:tiktok\.com\/@)([a-zA-Z0-9-]+)\/video\/([0-9]+)/
    }, {
      name: "Zee5",
      regex: /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:zee5\.com\/)(?:[a-zA-Z0-9-\/]+)(0-[0-9]-[a-z0-9_-]+)/
    }];
  }
  encSafe(t) {
    return btoa(t).replace("+", "-").replace("/", "_").replace("=", "");
  }
  decSafe(t) {
    let data = t.replace("-", "+").replace("_", "/");
    const mod4 = data.length % 4;
    if (mod4) data += "====".substr(mod4);
    return atob(data);
  }
  encData(data, key = this.pubKey) {
    return data ? this.encSafe(CryptoJS.AES.encrypt(JSON.stringify(data), key, {
      format: this.format
    }).toString().trim()) : false;
  }
  decData(data) {
    if (!data) return false;
    const decrypted = CryptoJS.AES.decrypt(this.decSafe(data), this.pubKey, {
      format: this.format
    }).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted).trim();
  }
  async getSubtitles(url) {
    try {
      const videoMatch = this.platform.find(({
        regex
      }) => regex.test(url));
      if (!videoMatch) throw new Error("Unsupported platform");
      const videoId = url.match(videoMatch.regex)[1];
      const urlEncrypt = this.encData(url);
      const dataEncrypt = this.encData(urlEncrypt, url);
      const payload = JSON.stringify({
        url: url,
        data: dataEncrypt
      });
      const {
        data
      } = await axios.post(this.baseURL, payload, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      console.error("Error fetching subtitles:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async download({
    url,
    name,
    type,
    index
  }) {
    try {
      const result = await this.getSubtitles(url);
      if (result.state !== 2) throw new Error("Failed to fetch subtitles");
      const subtitle = name ? result.subtitlesAutoTrans.find(sub => sub.name === name) || result.subtitles[0] : result.subtitlesAutoTrans[index] || result.subtitles[index] || result.subtitles[0];
      const downloadUrl = `https://download.subtitle.to/?title=${encodeURIComponent(`[${subtitle.name}] ${result.title} [DownSub.com]`)}&url=${subtitle.url}${type ? `&type=${type}` : ""}`;
      const decode = url => this.decData(url);
      result.downloadUrl = downloadUrl;
      result.subtitles = result.subtitles.map(sub => ({
        ...sub,
        decUrl: decode(sub.url)
      }));
      result.subtitlesAutoTrans = result.subtitlesAutoTrans.map(sub => ({
        ...sub,
        decUrl: decode(sub.url)
      }));
      return result;
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const downloader = new Downsub();
  try {
    const data = await downloader.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}