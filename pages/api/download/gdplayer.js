import axios from "axios";
import * as cheerio from "cheerio";
import CryptoJS from "crypto-js";
const CryptoJSAesJson = {
  stringify: function(cipherParams) {
    const jsonObj = {
      ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64)
    };
    if (cipherParams.iv) {
      jsonObj.iv = cipherParams.iv.toString();
    }
    if (cipherParams.salt) {
      jsonObj.s = cipherParams.salt.toString();
    }
    return JSON.stringify(jsonObj).replace(/\s/g, "");
  },
  parse: function(jsonStr) {
    const jsonObj = JSON.parse(jsonStr);
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct)
    });
    if (jsonObj.iv) {
      cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv);
    }
    if (jsonObj.s) {
      cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s);
    }
    return cipherParams;
  }
};
class GdPlayerDownloader {
  constructor() {
    this.headers = {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "id-ID,id;q=0.9",
      Connection: "keep-alive",
      Origin: "https://gdplayer.to",
      Referer: "https://gdplayer.to/",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site"
    };
    this.secretKey = "F1r3b4Ll_GDP~5H";
    this.cookies = {};
  }
  interceptCookies(response) {
    try {
      if (response.headers && response.headers["set-cookie"]) {
        const cookieHeaders = response.headers["set-cookie"];
        cookieHeaders.forEach(cookie => {
          const cookieParts = cookie.split(";")[0].split("=");
          if (cookieParts.length === 2) {
            this.cookies[cookieParts[0]] = cookieParts[1];
          }
        });
      }
    } catch (error) {
      console.error("Error intercepting cookies:", error.message);
    }
  }
  getCookieString() {
    return Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
  }
  decrypt(encryptedData) {
    try {
      console.log("Memulai proses dekripsi...");
      const encryptedJsonStr = JSON.stringify(encryptedData);
      const cipherParams = CryptoJSAesJson.parse(encryptedJsonStr);
      const decrypted = CryptoJS.AES.decrypt(cipherParams, this.secretKey, {
        format: CryptoJSAesJson
      });
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      if (!decryptedText) {
        throw new Error("Hasil dekripsi kosong");
      }
      return JSON.parse(decryptedText);
    } catch (error) {
      console.error("Error dalam dekripsi:", error.message);
      throw new Error(`Dekripsi gagal: ${error.message}`);
    }
  }
  extractVar(scriptContent, varName) {
    try {
      console.log(`Mengekstrak variabel ${varName}...`);
      const searchString = `window.${varName}="`;
      const startIndex = scriptContent.indexOf(searchString);
      if (startIndex === -1) {
        throw new Error(`Variabel ${varName} tidak ditemukan`);
      }
      const endIndex = scriptContent.indexOf('";', startIndex);
      if (endIndex === -1) {
        throw new Error(`Format variabel ${varName} tidak valid`);
      }
      const codes = scriptContent.substring(startIndex + searchString.length, endIndex);
      console.log(`${varName}:`, codes);
      return codes;
    } catch (error) {
      console.error(`Error ekstraksi ${varName}:`, error.message);
      throw error;
    }
  }
  async getLinks({
    url
  }) {
    try {
      console.log("Memproses URL...");
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 1e4
      });
      this.interceptCookies(response);
      const html = response.data;
      const $ = cheerio.load(html);
      let scriptContent = "";
      $("script").each((i, el) => {
        const script = $(el).html();
        if (script && script.includes("window.kaken")) {
          scriptContent = script;
          return false;
        }
      });
      if (!scriptContent) {
        throw new Error("Script dengan variabel tidak ditemukan");
      }
      const apx = this.extractVar(scriptContent, "apx");
      const kaken = this.extractVar(scriptContent, "kaken");
      const qsx = this.extractVar(scriptContent, "qsx");
      const configUrlBase = Buffer.from(apx, "base64").toString("utf8");
      const configUrl = `${configUrlBase}?${qsx}&dl=1`;
      console.log("configUrl:", configUrl);
      const configResponse = await axios.get(configUrl, {
        headers: {
          ...this.headers,
          Cookie: this.getCookieString()
        },
        timeout: 1e4
      });
      this.interceptCookies(configResponse);
      const encryptedConfig = configResponse.data;
      const config = JSON.parse(this.decrypt(encryptedConfig));
      console.log("config:", config);
      if (!config) {
        throw new Error("Config tidak valid atau apiURL tidak ditemukan");
      }
      console.log("Config berhasil didapatkan dari:", config.apiURL);
      const apiUrl = `${config.apiURL}api/`;
      const apiHeaders = {
        ...this.headers,
        "Content-Type": "text/plain",
        Cookie: this.getCookieString(),
        "X-Requested-With": "XMLHttpRequest"
      };
      console.log("Mengirim payload:", kaken);
      const finalResponse = await axios.post(apiUrl, kaken, {
        headers: apiHeaders,
        timeout: 15e3
      });
      this.interceptCookies(finalResponse);
      const finalData = finalResponse.data;
      console.log("Response dari API:", finalData);
      if (finalData) {
        console.log("\n=== HASIL DOWNLOAD ===");
        return finalData;
      } else {
        const errorMsg = finalData && finalData.message ? `Error: ${finalData.message}` : "Tidak ada link download yang tersedia";
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error dalam getLinks:", error.message);
      if (error.response) {
        console.error(`HTTP Status: ${error.response.status}`);
        console.error("Response data:", error.response.data);
      }
      if (error.code) {
        console.error(`Error Code: ${error.code}`);
      }
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const downloader = new GdPlayerDownloader();
    const response = await downloader.getLinks(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}