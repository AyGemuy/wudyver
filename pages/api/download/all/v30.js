import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import CryptoJS from "crypto-js";

function md5cycle(state, block) {
  let [a, b, c, d] = state;

  function ff(a, b, c, d, x, s, t) {
    a = a + (b & c | ~b & d) + x + t | 0;
    return (a << s | a >>> 32 - s) + b | 0;
  }

  function gg(a, b, c, d, x, s, t) {
    a = a + (b & d | c & ~d) + x + t | 0;
    return (a << s | a >>> 32 - s) + b | 0;
  }

  function hh(a, b, c, d, x, s, t) {
    a = a + (b ^ c ^ d) + x + t | 0;
    return (a << s | a >>> 32 - s) + b | 0;
  }

  function ii(a, b, c, d, x, s, t) {
    a = a + (c ^ (b | ~d)) + x + t | 0;
    return (a << s | a >>> 32 - s) + b | 0;
  }
  a = ff(a, b, c, d, block[0], 7, -680876936);
  d = ff(d, a, b, c, block[1], 12, -389564586);
  c = ff(c, d, a, b, block[2], 17, 606105819);
  b = ff(b, c, d, a, block[3], 22, -1044525330);
  a = ff(a, b, c, d, block[4], 7, -176418897);
  d = ff(d, a, b, c, block[5], 12, 1200080426);
  c = ff(c, d, a, b, block[6], 17, -1473231341);
  b = ff(b, c, d, a, block[7], 22, -45705983);
  a = ff(a, b, c, d, block[8], 7, 1770035416);
  d = ff(d, a, b, c, block[9], 12, -1958414417);
  c = ff(c, d, a, b, block[10], 17, -42063);
  b = ff(b, c, d, a, block[11], 22, -1990404162);
  a = ff(a, b, c, d, block[12], 7, 1804603682);
  d = ff(d, a, b, c, block[13], 12, -40341101);
  c = ff(c, d, a, b, block[14], 17, -1502002290);
  b = ff(b, c, d, a, block[15], 22, 1236535329);
  a = gg(a, b, c, d, block[1], 5, -165796510);
  d = gg(d, a, b, c, block[6], 9, -1069501632);
  c = gg(c, d, a, b, block[11], 14, 643717713);
  b = gg(b, c, d, a, block[0], 20, -373897302);
  a = gg(a, b, c, d, block[5], 5, -701558691);
  d = gg(d, a, b, c, block[10], 9, 38016083);
  c = gg(c, d, a, b, block[15], 14, -660478335);
  b = gg(b, c, d, a, block[4], 20, -405537848);
  a = gg(a, b, c, d, block[9], 5, 568446438);
  d = gg(d, a, b, c, block[14], 9, -1019803690);
  c = gg(c, d, a, b, block[3], 14, -187363961);
  b = gg(b, c, d, a, block[8], 20, 1163531501);
  a = gg(a, b, c, d, block[13], 5, -1444681467);
  d = gg(d, a, b, c, block[2], 9, -51403784);
  c = gg(c, d, a, b, block[7], 14, 1735328473);
  b = gg(b, c, d, a, block[12], 20, -1926607734);
  a = hh(a, b, c, d, block[5], 4, -378558);
  d = hh(d, a, b, c, block[8], 11, -2022574463);
  c = hh(c, d, a, b, block[11], 16, 1839030562);
  b = hh(b, c, d, a, block[14], 23, -35309556);
  a = hh(a, b, c, d, block[1], 4, -1530992060);
  d = hh(d, a, b, c, block[4], 11, 1272893353);
  c = hh(c, d, a, b, block[7], 16, -155497632);
  b = hh(b, c, d, a, block[10], 23, -1094730640);
  a = hh(a, b, c, d, block[13], 4, 681279174);
  d = hh(d, a, b, c, block[0], 11, -358537222);
  c = hh(c, d, a, b, block[3], 16, -722521979);
  b = hh(b, c, d, a, block[6], 23, 76029189);
  a = hh(a, b, c, d, block[9], 4, -640364487);
  d = hh(d, a, b, c, block[12], 11, -421815835);
  c = hh(c, d, a, b, block[15], 16, 530742520);
  b = hh(b, c, d, a, block[2], 23, -995338651);
  a = ii(a, b, c, d, block[0], 6, -198630844);
  d = ii(d, a, b, c, block[7], 10, 1126891415);
  c = ii(c, d, a, b, block[14], 15, -1416354905);
  b = ii(b, c, d, a, block[5], 21, -57434055);
  a = ii(a, b, c, d, block[12], 6, 1700485571);
  d = ii(d, a, b, c, block[3], 10, -1894986606);
  c = ii(c, d, a, b, block[10], 15, -1051523);
  b = ii(b, c, d, a, block[1], 21, -2054922799);
  a = ii(a, b, c, d, block[8], 6, 1873313359);
  d = ii(d, a, b, c, block[15], 10, -30611744);
  c = ii(c, d, a, b, block[6], 15, -1560198380);
  b = ii(b, c, d, a, block[13], 21, 1309151649);
  a = ii(a, b, c, d, block[4], 6, -145523070);
  d = ii(d, a, b, c, block[11], 10, -1120210379);
  c = ii(c, d, a, b, block[2], 15, 718787259);
  b = ii(b, c, d, a, block[9], 21, -343485551);
  state[0] = state[0] + a | 0;
  state[1] = state[1] + b | 0;
  state[2] = state[2] + c | 0;
  state[3] = state[3] + d | 0;
}

function md5blk(s) {
  const md5blks = [];
  for (let i = 0; i < 64; i += 4) {
    md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
  }
  return md5blks;
}

function md51(s) {
  let n = s.length,
    state = [1732584193, -271733879, -1732584194, 271733878],
    i;
  for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(s.substring(i - 64, i)));
  s = s.substring(i - 64);
  const tail = new Array(16).fill(0);
  for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << (i % 4 << 3);
  tail[i >> 2] |= 128 << (i % 4 << 3);
  if (i > 55) {
    md5cycle(state, tail);
    tail.fill(0);
  }
  const bits = n * 8;
  tail[14] = bits & -1;
  tail[15] = bits / 4294967296 | 0;
  md5cycle(state, tail);
  return state;
}

function rhex(n) {
  const hex = "0123456789abcdef";
  let s = "";
  for (let j = 0; j < 4; j++) s += hex[n >> j * 8 + 4 & 15] + hex[n >> j * 8 & 15];
  return s;
}

function originalMd5(s) {
  return md51(s).map(rhex).join("");
}

function replaceBD(str) {
  return str.replace(/b/g, "#").replace(/d/g, "b").replace(/#/g, "d");
}
const STANDARD_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const CUSTOM_B64 = "ZYXABCDEFGHIJKLMNOPQRSTUVWzyxabcdefghijklmnopqrstuvw9876543210-_";

function xorString(str, key = 90) {
  return str.split("").map(char => String.fromCharCode(char.charCodeAt(0) ^ key)).join("");
}

function blockReverse(str, blockSize = 8) {
  let result = "";
  for (let i = 0; i < str.length; i += blockSize) {
    result += str.slice(i, i + blockSize).split("").reverse().join("");
  }
  return result;
}

function base64CustomDecode(str) {
  return str.split("").map(char => {
    const index = CUSTOM_B64.indexOf(char);
    return index === -1 ? char : STANDARD_B64[index];
  }).join("");
}

function aesDecryptOriginal(encBase64, ivBase64, keyStr) {
  const key = CryptoJS.enc.Utf8.parse(keyStr);
  const iv = CryptoJS.enc.Base64.parse(ivBase64);
  const decrypted = CryptoJS.AES.decrypt(encBase64, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
}

function kukudemethod(encData, ivData, key) {
  let data = xorString(encData);
  let iv = xorString(ivData);
  data = blockReverse(data);
  iv = blockReverse(iv);
  data = base64CustomDecode(data);
  iv = base64CustomDecode(iv);
  return aesDecryptOriginal(data, iv, key);
}
class KukuClient {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        Origin: "https://dy.kukutool.com",
        Referer: "https://dy.kukutool.com/en",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    }));
    this.secret = "5Q0NvQxD0zdQ5RLQy5xs";
    this.aesKey = "12345678901234567890123456789013";
  }
  createSignedParams(params) {
    const ts = Math.floor(Date.now() / 1e3);
    const salt = Math.random().toString(36).substring(2, 10);
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys.map(key => `${key}=${params[key]}`).join("&");
    const signRaw = `${paramString}&salt=${salt}&ts=${ts}&secret=${this.secret}`;
    const md5Hash = originalMd5(signRaw);
    const sign = replaceBD(md5Hash);
    return {
      ...params,
      ts: ts,
      salt: salt,
      sign: sign
    };
  }
  async download({
    url: targetUrl,
    ...rest
  }) {
    try {
      console.log(`[${new Date().toLocaleTimeString()}] Memproses URL: ${targetUrl}`);
      const payload = this.createSignedParams({
        requestURL: targetUrl,
        captchaKey: "",
        captchaInput: "",
        ...rest
      });
      const response = await this.client.post("https://dy.kukutool.com/api/parse", payload);
      const resData = response.data;
      if (resData.status === 0 && resData.data) {
        if (resData.encrypt) {
          const decrypted = kukudemethod(resData.data, resData.iv, this.aesKey);
          return {
            success: true,
            result: decrypted
          };
        }
        return {
          success: true,
          result: resData.data
        };
      } else {
        return {
          success: false,
          error: resData.message || "Gagal parse data"
        };
      }
    } catch (e) {
      return {
        success: false,
        error: e.message
      };
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
  const api = new KukuClient();
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