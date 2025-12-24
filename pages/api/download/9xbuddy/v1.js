import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
class XBuddyDownloader {
  constructor() {
    this.mCss = "/build/main.0ae41371bd7ead4356ae.css";
    this.windowInit = {
      ua: btoa("Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36"),
      appVersion: "11.1.5"
    };
    this.hostname = "9xbuddy.site";
    this.accessToken = null;
    this.selected = null;
    this.baseHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json; charset=UTF-8",
      origin: "https://9xbuddy.site",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://9xbuddy.site/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": atob(this.windowInit.ua),
      "x-requested-domain": "9xbuddy.site",
      "x-requested-with": "xmlhttprequest"
    };
  }
  decode64(e) {
    e = e.replace(/\s/g, "");
    if (/^[a-z0-9\+\/\s]+\={0,2}$/i.test(e) && !(e.length % 4 > 0)) {
      let t, r, n = 0,
        s = [];
      for (e = e.replace(/=/g, ""); n < e.length;) {
        switch (t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(e.charAt(n)), n % 4) {
          case 1:
            s.push(String.fromCharCode(r << 2 | t >> 4));
            break;
          case 2:
            s.push(String.fromCharCode((15 & r) << 4 | t >> 2));
            break;
          case 3:
            s.push(String.fromCharCode((3 & r) << 6 | t));
        }
        r = t;
        n++;
      }
      return s.join("");
    }
    return "";
  }
  ord(e) {
    const t = "".concat(e);
    const r = t.charCodeAt(0);
    if (r >= 55296 && r <= 56319) {
      const n = r;
      return 1 === t.length ? r : 1024 * (n - 55296) + (t.charCodeAt(1) - 56320) + 65536;
    }
    return r;
  }
  encode64(e) {
    if (/([^\u0000-\u00ff])/.test(e)) throw new Error("Can't base64 encode non-ASCII characters.");
    let t, r, n, s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
      a = 0,
      o = [];
    for (; a < e.length;) {
      switch (t = e.charCodeAt(a), n = a % 3) {
        case 0:
          o.push(s.charAt(t >> 2));
          break;
        case 1:
          o.push(s.charAt((3 & r) << 4 | t >> 4));
          break;
        case 2:
          o.push(s.charAt((15 & r) << 2 | t >> 6));
          o.push(s.charAt(63 & t));
      }
      r = t;
      a++;
    }
    return 0 == n ? (o.push(s.charAt((3 & r) << 4)), o.push("==")) : 1 == n && (o.push(s.charAt((15 & r) << 2)), o.push("=")), o.join("");
  }
  encrypt(e, t) {
    let r = "";
    for (let n = 0; n < e.length; n++) {
      let s = e.substr(n, 1);
      let keyCharIndex = n % t.length - 1;
      if (keyCharIndex < 0) {
        keyCharIndex += t.length;
      }
      let a = t.substr(keyCharIndex, 1);
      s = Math.floor(this.ord(s) + this.ord(a));
      r += String.fromCharCode(s);
    }
    return this.encode64(r);
  }
  decrypt(e, t) {
    let r = "";
    e = this.decode64(e);
    for (let n = 0; n < e.length; n++) {
      let s = e.substr(n, 1);
      let keyCharIndex = n % t.length - 1;
      if (keyCharIndex < 0) {
        keyCharIndex += t.length;
      }
      let a = t.substr(keyCharIndex, 1);
      s = Math.floor(this.ord(s) - this.ord(a));
      r += String.fromCharCode(s);
    }
    return r;
  }
  _gatherTokenData() {
    const sMatch = /\/build\/main\.([^"]+?).css/g.exec(this.mCss);
    const s1 = sMatch ? sMatch[1] : "";
    const a = s1.split("").reverse().join("");
    const o = this.windowInit.ua.split("").reverse().join("").substr(0, 10);
    const c = "SORRY_MATE_IM_NOT_GONNA_TELL_YOU";
    const i = this.windowInit.appVersion;
    const u = `xbuddy123sudo-${i}`;
    const l = this.hostname + a + o + c + u + i;
    return {
      l: l,
      a: a
    };
  }
  generateAuthToken() {
    const {
      l: payload,
      a: encryptionKey
    } = this._gatherTokenData();
    return this.encrypt(payload, encryptionKey);
  }
  async getHeaders(includeAccessToken = true) {
    const headers = {
      ...this.baseHeaders,
      "x-auth-token": this.generateAuthToken()
    };
    if (includeAccessToken) {
      if (!this.accessToken) {
        await this.fetchAccessToken();
      }
      headers["x-access-token"] = this.accessToken;
    } else {
      headers["x-access-token"] = "false";
    }
    return headers;
  }
  async _makeApiRequest(method, url, body = {}, includeAccessToken = true, responseType = "json") {
    try {
      console.time(`request to ${url}`);
      const headers = await this.getHeaders(includeAccessToken);
      const config = {
        headers: headers,
        responseType: responseType
      };
      let response;
      if (method === "POST") {
        response = await axios.post(url, body, config);
      } else if (method === "GET") {
        response = await axios.get(url, config);
      } else {
        throw new Error(`Unsupported HTTP method: ${method}`);
      }
      console.timeEnd(`request to ${url}`);
      return response.data;
    } catch (error) {
      console.timeEnd(`request to ${url}`);
      throw new Error(`API request to ${url} failed: ${error.message}`);
    }
  }
  async fetchAccessToken() {
    const responseData = await this._makeApiRequest("POST", "https://ab1.9xbud.com/token", {}, false);
    this.accessToken = responseData.access_token;
    return responseData;
  }
  validateString(string, inputName) {
    if (typeof string !== "string" || string?.trim()?.length === 0) {
      throw new Error(`Invalid input ${inputName}`);
    }
  }
  createSigAndUrlEncoded(url) {
    const generateSig = url => {
      const encodedUrl = encodeURIComponent(url);
      const xA = this.generateAuthToken();
      const key = xA + "jv7g2_DAMNN_DUDE";
      const _sig = this.encrypt(encodedUrl, key);
      return {
        url: encodedUrl,
        _sig: _sig
      };
    };
    return generateSig(url);
  }
  fixExtractJson(originalResponse) {
    const token = originalResponse.response.token;
    const decryptEncryptedUrl = (hexUrl, token) => {
      const cssVersion = "0ae41371bd7ead4356ae";
      const hostnameLength = 12;
      const hex2bin = hex => {
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) {
          const byte = parseInt(hex.substr(i, 2), 16);
          if (isNaN(byte)) return false;
          bytes.push(byte);
        }
        return String.fromCharCode(...bytes);
      };
      const decrypt = (data, key) => {
        const decoded = this.decode64(data);
        let result = "";
        for (let i = 0; i < decoded.length; i++) {
          const s = decoded[i];
          let kIndex = i % key.length - 1;
          if (kIndex < 0) kIndex += key.length;
          const k = key[kIndex];
          result += String.fromCharCode(this.ord(s) - this.ord(k));
        }
        return result;
      };
      const reversed = hex2bin(hexUrl).split("").reverse().join("");
      const baseKey = "SORRY_MATE";
      const finalKey = `${baseKey}${hostnameLength}${cssVersion}${token}`;
      return decrypt(reversed, finalKey);
    };
    const oldFormats = originalResponse.response.formats;
    const newFormats = oldFormats.map(v => {
      v.url = decryptEncryptedUrl(v.url, token);
      return v;
    });
    originalResponse.response.formats = newFormats;
    return originalResponse;
  }
  async extract(yourUrl, searchEngine = "yt") {
    this.validateString(yourUrl, "input url di fungsi extract");
    const {
      url,
      _sig
    } = this.createSigAndUrlEncoded(yourUrl);
    const body = {
      url: url,
      _sig: _sig,
      searchEngine: searchEngine
    };
    const responseData = await this._makeApiRequest("POST", "https://ab1.9xbud.com/extract", body);
    return this.fixExtractJson(responseData);
  }
  async getSupportedFormat(youtubeUrl, yourFormat = "720p") {
    this.validateString(youtubeUrl, "youtubeUrl di fungsi getSupportedFormat");
    const allFormats = ["144p", "240p", "360p", "480p", "720p", "1080p"];
    if (!allFormats.includes(yourFormat)) {
      throw new Error(`Invalid format. Please pick one: ${allFormats.join(", ")}`);
    }
    const fromExtract = await this.extract(youtubeUrl);
    const filtered = fromExtract.response.formats.filter(v => allFormats.includes(v.quality));
    let find;
    for (let i = allFormats.indexOf(yourFormat); i > -1; i--) {
      find = filtered.find(v => v.quality == allFormats[i]);
      if (find) break;
    }
    if (find && allFormats.indexOf(yourFormat) > allFormats.indexOf(find.quality)) {
      console.log(`🐈 Kualitas ${yourFormat} tidak tersedia. Auto fallback ke ${find.quality}`);
    } else if (!find) {
      throw new Error(`No supported format found for ${yourFormat} or lower.`);
    }
    this.selected = find;
    return find;
  }
  async convert(pickedObjectFormat) {
    const uid = pickedObjectFormat.url.split("/")[2];
    const url = pickedObjectFormat.url.split("/")[3];
    const body = {
      uid: uid,
      url: url
    };
    return await this._makeApiRequest("POST", "https://ab1.9xbud.com/convert", body);
  }
  async progress(pickedObjectFormat) {
    const uid = pickedObjectFormat.url.split("/")[2];
    const body = {
      uid: uid
    };
    return await this._makeApiRequest("POST", "https://ab1.9xbud.com/progress", body);
  }
  async downloadBuffer(progressObject) {
    console.log("🐈 Mulai download, sabar ya...");
    const url = progressObject.response.url;
    const bufferData = await this._makeApiRequest("GET", url, {}, true, "arraybuffer");
    return Buffer.from(bufferData);
  }
  async downloadVideo(yourYoutubeUrl, videoResolution = "720p") {
    this.validateString(yourYoutubeUrl, "youtube url di function downloadVideo");
    const pickedObjectFormat = await this.getSupportedFormat(yourYoutubeUrl, videoResolution);
    await this.convert(pickedObjectFormat);
    const MAX_FETCH_ATTEMPT = 100;
    let apiHit = 0;
    let objectProgress = {};
    do {
      apiHit++;
      if (apiHit > MAX_FETCH_ATTEMPT) {
        throw new Error(`Mencapai limit hit api ${MAX_FETCH_ATTEMPT} kali`);
      }
      objectProgress = await this.progress(pickedObjectFormat);
      console.log(`🐈 Cek progres #${apiHit}`);
      if (objectProgress?.status === 0) {
        throw new Error(`Gagal mendownload video: ${objectProgress.message || "Unknown error"}`);
      }
      if (!objectProgress?.response) {
        await new Promise(resolve => setTimeout(resolve, 5e3));
      }
    } while (!objectProgress.response);
    const buffer = await this.downloadBuffer(objectProgress);
    return buffer;
  }
  async uploadMedia(buffer, filename = "video.mp4") {
    console.log("🐈 Mengunggah ke qu.ax...");
    const formData = new FormData();
    formData.append("file", new Blob([buffer], {
      type: "video/mp4"
    }), filename);
    try {
      const response = await axios.post("https://cdn.stylar.ai/api/v1/upload", formData, {
        headers: formData.headers
      });
      console.log("Sukses mengunggah ke qu.ax:", response.data);
      return response.data;
    } catch (error) {
      console.error("Gagal mengunggah ke qu.ax:", error);
      throw error;
    }
  }
  async download({
    url: youtubeUrl,
    quality: resolution = "144p",
    output = "url"
  }) {
    try {
      const buffer = await this.downloadVideo(youtubeUrl, resolution);
      let result;
      if (output == "url") {
        result = {
          upload: await this.uploadMedia(buffer),
          selected: this.selected
        };
      } else {
        result = {
          selected: this.selected,
          base64: buffer.toString("base64")
        };
      }
      return result;
    } catch (error) {
      console.error("Gagal mengunggah atau memproses upload:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) return res.status(400).json({
    error: "Missing required field: url"
  });
  const downloader = new XBuddyDownloader();
  try {
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message
    });
  }
}