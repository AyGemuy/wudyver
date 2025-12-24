import axios from "axios";
import * as cheerio from "cheerio";
class RegCheckerAPI {
  constructor() {
    this.baseUrl = "https://myim3.indosatooredoo.com/ceknomor";
    this.customHeaders = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://myim3.indosatooredoo.com",
      Referer: "https://myim3.indosatooredoo.com/ceknomor/index",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.60"
    };
  }
  async regChecker(nik, kk) {
    try {
      const postData = new URLSearchParams({
        nik: nik,
        kk: kk,
        "g-recaptcha-response": "",
        send: "PERIKSA"
      });
      const postResponse = await axios.post(`${this.baseUrl}/checkForm`, postData, {
        headers: this.customHeaders,
        maxRedirects: 0
      });
      if (postResponse.status === 302) {
        const cookies = postResponse.headers["set-cookie"]?.join("; ") || "";
        return await this.fetchResults(cookies);
      }
    } catch (error) {
      if (error.response?.status === 302) {
        const cookies = error.response.headers["set-cookie"]?.join("; ") || "";
        return await this.fetchResults(cookies);
      }
      console.error("Error:", error);
    }
  }
  async fetchResults(cookieString) {
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}/result`, {
        headers: {
          Cookie: cookieString
        }
      });
      const $ = cheerio.load(data);
      const thumbs = [];
      $(".container.col-5 img").each((i, element) => {
        thumbs.push(`https://myim3.indosatooredoo.com${$(element).attr("src")}`);
      });
      const numbers = [];
      $("li").each((i, element) => {
        numbers.push($(element).text());
      });
      const listNumbers = numbers.map(number => ({
        number: number,
        provider: this.getProviderFromNumber(number)
      }));
      return {
        thumbs: thumbs,
        listNumbers: listNumbers
      };
    } catch (error) {
      console.error("Fetch Result Error:", error);
    }
  }
  getProviderFromNumber(number) {
    const providerMap = {
      "Indosat Ooredoo": ["62814", "62815", "62816", "62855", "62856", "62857", "62858"],
      "XL Axiata": ["62817", "62818", "62819", "62859", "62877", "62878"],
      "3 Indonesia (Three)": ["62895", "62896", "62897", "62898", "62899"],
      "Smartfren Telecom": ["62881", "62882", "62883", "62884", "62885", "62886", "62887"],
      Telkomsel: ["62811", "62812", "62813", "62821", "62822", "62823", "62852", "62853", "62851"],
      "BYRU Satelit": ["62868"],
      Axis: ["62832", "62833", "62838", "62831"]
    };
    const prefix = number.substring(0, 5);
    for (const provider in providerMap) {
      if (providerMap[provider].includes(prefix)) {
        return provider;
      }
    }
    return "Provider tidak dikenal";
  }
}
export default async function handler(req, res) {
  const {
    nik,
    kk
  } = req.method === "GET" ? req.query : req.body;
  const regCheckerAPI = new RegCheckerAPI();
  try {
    if (!nik || !kk) {
      return res.status(400).json({
        error: "Missing required parameters: nik, kk"
      });
    }
    const result = await regCheckerAPI.regChecker(nik, kk);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}