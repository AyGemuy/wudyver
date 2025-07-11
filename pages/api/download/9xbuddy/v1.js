import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
const BASE_URL = "https://9xbuddy.com/";
const URL_TOKEN = "https://ab1.9xbud.com/token";
const URL_EXTRACT = "https://ab1.9xbud.com/extract";
const URL_CONVERT = "https://ab1.9xbud.com/convert";
const REG_DATA = /window.__INIT__\s?=\s?(.*);?<\/script>/;
class NineXBuddy {
  constructor() {
    this.FULL_DATA = {};
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.headList = {
      authority: "ab1.9xbud.com",
      accept: "application/json, text/plain, */*",
      "accept-encoding": "gzip",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7,ru;q=0.6",
      "content-type": "application/json; charset=UTF-8",
      origin: "https://9xbuddy.com",
      priority: "u=1, i",
      referer: "https://9xbuddy.com/",
      "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
      "x-requested-domain": "9xbuddy.com",
      "x-requested-with": "xmlhttprequest"
    };
  }
  async fetchContent(url, method = "GET", data = null) {
    try {
      const response = await this.client({
        method: method,
        url: url,
        headers: this.headList,
        data: data
      });
      return response;
    } catch (error) {
      return error.response || error;
    }
  }
  async initData() {
    const response = await this.fetchContent(BASE_URL);
    const txt = response.data;
    const mt = txt.match(REG_DATA)[1];
    this.FULL_DATA = JSON.parse(mt);
  }
  encode64(p70) {
    if (/([^\u0000-\u00ff])/.test(p70)) {
      console.error("Can't base64 encode non-ASCII characters.");
    }
    let v146;
    let v151 = [];
    let v147;
    let v148;
    let v149 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (let v150 = 0; v150 < p70.length;) {
      v146 = p70.charCodeAt(v150);
      switch (v148 = v150 % 3) {
        case 0:
          v151.push(v149.charAt(v146 >> 2));
          break;
        case 1:
          v151.push(v149.charAt((v147 & 3) << 4 | v146 >> 4));
          break;
        case 2:
          v151.push(v149.charAt((v147 & 15) << 2 | v146 >> 6));
          v151.push(v149.charAt(v146 & 63));
      }
      v147 = v146;
      v150++;
    }
    if (v148 == 0) {
      v151.push(v149.charAt((v147 & 3) << 4));
      v151.push("==");
    } else if (v148 == 1) {
      v151.push(v149.charAt((v147 & 15) << 2));
      v151.push("=");
    }
    return v151.join("");
  }
  ord(p69) {
    let v144 = `${p69}`;
    let v145 = v144.charCodeAt(0);
    if (v145 >= 55296 && v145 <= 56319) {
      let vV145 = v145;
      if (v144.length === 1) {
        return v145;
      } else {
        return (vV145 - 55296) * 1024 + (v144.charCodeAt(1) - 56320) + 65536;
      }
    }
    return v145;
  }
  encrypt(p71, p72) {
    let v152 = "";
    for (let v153 = 0; v153 < p71.length; v153++) {
      let v154 = p71.substr(v153, 1);
      let v155 = p72.substr(v153 % p72.length - 1, 1);
      v154 = Math.floor(this.ord(v154) + this.ord(v155));
      v152 += v154 = String.fromCharCode(v154);
    }
    return this.encode64(v152);
  }
  hex2bin(p118) {
    let v234;
    let v235 = [];
    let v236 = 0;
    for (v234 = (p118 += "").length; v236 < v234; v236 += 2) {
      let vParseInt2 = parseInt(p118.substr(v236, 1), 16);
      let vParseInt3 = parseInt(p118.substr(v236 + 1, 1), 16);
      if (isNaN(vParseInt2) || isNaN(vParseInt3)) {
        return false;
      }
      v235.push(vParseInt2 << 4 | vParseInt3);
    }
    return String.fromCharCode.apply(String, v235);
  }
  decode64(p111) {
    p111 = p111.replace(/\s/g, "");
    if (/^[a-z0-9\+\/\s]+\={0,2}$/i.test(p111) && !(p111.length % 4 > 0)) {
      var v214;
      var v215;
      var v216 = 0;
      var v217 = [];
      for (p111 = p111.replace(/=/g, ""); v216 < p111.length;) {
        v214 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(p111.charAt(v216));
        switch (v216 % 4) {
          case 1:
            v217.push(String.fromCharCode(v215 << 2 | v214 >> 4));
            break;
          case 2:
            v217.push(String.fromCharCode((v215 & 15) << 4 | v214 >> 2));
            break;
          case 3:
            v217.push(String.fromCharCode((v215 & 3) << 6 | v214));
        }
        v215 = v214;
        v216++;
      }
      return v217.join("");
    }
  }
  decrypt(p116, p117) {
    let v230 = "";
    p116 = this.decode64(p116);
    for (let v231 = 0; v231 < p116.length; v231++) {
      let v232 = p116.substr(v231, 1);
      let v233 = p117.substr(v231 % p117.length - 1, 1);
      v232 = Math.floor(this.ord(v232) - this.ord(v233));
      v230 += v232 = String.fromCharCode(v232);
    }
    return v230;
  }
  async reverse(p67, p68) {
    if (!p67 || !p68) {
      return null;
    }
    if (!this.v113) {
      const response = await this.fetchContent(BASE_URL);
      this.v113 = response.data;
    }
    let v114 = /\/build\/main\.([^"]+?).css/g.exec(this.v113);
    if (!v114) {
      return "";
    }
    let v115 = v114[1];
    let v116 = this.hex2bin(p67).split("").reverse().join("");
    let v117 = [69, 84, 65, 77, 95, 89, 82, 82, 79, 83].map(function(p69) {
      return String.fromCharCode(p69);
    }).join("").split("").reverse().join("");
    let v118 = `${v117}${"9xbuddy.com".length}${v115}${p68}`;
    return this.decrypt(v116, v118);
  }
  async syntx() {
    const response = await this.fetchContent(BASE_URL);
    const v163 = response.data;
    const v165 = /\/build\/main\.([^"]+?).css/g.exec(v163);
    if (!v165) {
      return "";
    }
    const v166 = v165[1].split("").reverse().join("");
    const v167 = this.FULL_DATA.ua.split("").reverse().join("").substr(0, 10);
    const v168 = [90, 84, 94, 100, 81, 81, 74, 89, 100, 70, 83, 83, 84, 76, 100, 89, 84, 83, 100, 82, 78, 100, 74, 89, 70, 82, 100, 94, 87, 87, 84, 88].map(function(p79) {
      return String.fromCharCode(p79 - 5);
    }).reverse().join("");
    const v169 = this.FULL_DATA.appVersion;
    const v170 = `xxbuddy123-${v169}`;
    const v171 = "9xbuddy.com" + v166 + v167 + v168 + v170 + v169;
    return this.encrypt(v171, v166);
  }
  async getToken() {
    const response = await this.fetchContent(URL_TOKEN, "POST", JSON.stringify({}));
    return response.data.access_token;
  }
  async getDataToken(url) {
    await this.initData();
    const vEncodeURIComponent = encodeURIComponent(url);
    const authToken = await this.syntx();
    this.headList["x-auth-token"] = authToken;
    this.headList["x-access-token"] = false;
    const accessToken = await this.getToken();
    this.headList["x-access-token"] = accessToken;
    const _sig = this.encrypt(vEncodeURIComponent, `${authToken}jv7g2_DAMNN_DUDE`);
    return {
      authToken: authToken,
      _sig: _sig,
      accessToken: accessToken,
      vEncodeURIComponent: vEncodeURIComponent
    };
  }
  async getInfo(url) {
    const dt = await this.getDataToken(url);
    const payload = {
      url: dt.vEncodeURIComponent,
      _sig: dt._sig,
      searchEngine: "yt"
    };
    const response = await this.fetchContent(URL_EXTRACT, "POST", JSON.stringify(payload));
    return {
      data: response.data,
      dt: dt
    };
  }
  async download(url) {
    let decLink = {};
    try {
      const info = await this.getInfo(url);
      decLink = info.data;
      for (let i = 0; i < decLink.response.formats.length; i++) {
        const dec = decLink.response.formats[i];
        const rev = await this.reverse(dec.url, info.dt.accessToken);
        decLink.response.formats[i].url = rev;
      }
      return decLink;
    } catch {
      console.log("Waduh, link ini gak bisa kayaknya 😅");
      return decLink;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL is required"
    });
  }
  const scraper = new NineXBuddy();
  try {
    const results = await scraper.download(url);
    return res.status(200).json(results);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
}