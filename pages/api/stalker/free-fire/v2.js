import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class FreeFireInfoScraper {
  constructor() {}
  async search({
    uid
  }) {
    console.log(`[PROCESS] Starting Free Fire info search for UID: ${uid}`);
    const targetUrl = "https://freefireinfo.in/get-free-fire-account-information-via-uid/";
    const siteKey = "0x4AAAAAABAe_Da-31Q7nqIm";
    try {
      console.log("[PROCESS] Step 1: Getting Turnstile token...");
      const token = await this._getTurnstileToken(targetUrl, siteKey);
      console.log("[PROCESS] Step 1 completed: Turnstile token obtained.");
      console.log("[PROCESS] Step 2: Fetching and parsing Free Fire data...");
      const data = await this._fetchAndParse(uid, token, targetUrl);
      console.log("[PROCESS] Step 2 completed: Data fetched and parsed.");
      console.log("[PROCESS] Free Fire info search process completed successfully.");
      return data;
    } catch (error) {
      console.error(`[ERROR] Free Fire info search failed: ${error.message}`);
      return null;
    }
  }
  async _getTurnstileToken(targetUrl, siteKey) {
    try {
      console.log(`[DEBUG] Requesting Turnstile token for URL: ${targetUrl}, SiteKey: ${siteKey}`);
      const resp = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`, {
        params: {
          url: targetUrl,
          sitekey: siteKey
        },
        headers: {
          Accept: "application/json"
        }
      });
      if (!resp.data?.status) {
        throw new Error(resp.data.message || "Turnstile bypass API returned an error.");
      }
      if (!resp.data?.data?.token) {
        throw new Error("Token not found in API response data.");
      }
      return resp.data.token;
    } catch (error) {
      console.error(`[ERROR] _getTurnstileToken failed: ${error.message}`);
      throw error;
    }
  }
  async _fetchAndParse(uid, token, url) {
    try {
      console.log(`[DEBUG] Posting data to ${url} with UID: ${uid} and token.`);
      const html = await axios.post(url, new URLSearchParams({
        uid: uid,
        "cf-turnstile-response": token
      }).toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
        },
        withCredentials: true
      }).then(r => r.data);
      const $ = cheerio.load(html);
      const $result = $(".result");
      $result.find("br").replaceWith("\n");
      const lines = $result.text().split("\n").map(l => l.trim()).filter(l => l);
      const petIndex = lines.findIndex(l => l.includes("Pet Information"));
      const guildIndex = lines.findIndex(l => l.includes("Guild Information"));
      const accountInfo = {};
      lines.slice(0, petIndex > -1 ? petIndex : guildIndex > -1 ? guildIndex : lines.length).filter(l => l.startsWith("✔")).forEach(line => {
        const [key, ...vals] = line.slice(1).trim().split(":");
        accountInfo[key.trim()] = vals.join(":").trim();
      });
      console.log(`[DEBUG] Parsed Account Info: ${Object.keys(accountInfo).length} items.`);
      const petInfo = {};
      if (petIndex > -1) {
        lines.slice(petIndex + 1, guildIndex > -1 ? guildIndex : lines.length).filter(l => l.startsWith("✔")).forEach(line => {
          const [key, ...vals] = line.slice(1).trim().split(":");
          petInfo[key.trim()] = vals.join(":").trim();
        });
      }
      console.log(`[DEBUG] Parsed Pet Info: ${Object.keys(petInfo).length} items.`);
      const guildInfo = {};
      if (guildIndex > -1) {
        lines.slice(guildIndex + 1).filter(l => l.startsWith("✔")).forEach(line => {
          const [key, ...vals] = line.slice(1).trim().split(":");
          guildInfo[key.trim()] = vals.join(":").trim();
        });
      }
      console.log(`[DEBUG] Parsed Guild Info: ${Object.keys(guildInfo).length} items.`);
      const equipped = {};
      const $equipDiv = $(".equipped-items");
      $equipDiv.find("h4").each((_, h4) => {
        const category = $(h4).text().trim();
        equipped[category] = [];
        const items = $(h4).nextUntil("h4", ".equipped-item");
        items.each((_, item) => {
          const $item = $(item);
          const name = $item.find("p").text().trim();
          const img = $item.find("img").attr("data-lazy-src") || $item.find("img").attr("src");
          equipped[category].push({
            name: name,
            image: img
          });
        });
      });
      console.log(`[DEBUG] Parsed Equipped Items: ${Object.keys(equipped).length} categories.`);
      return {
        accountInfo: accountInfo,
        petInfo: petInfo,
        guildInfo: guildInfo,
        equipped: equipped
      };
    } catch (error) {
      console.error(`[ERROR] _fetchAndParse failed: ${error.message}`);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.uid) {
      return res.status(400).json({
        error: "uid are required"
      });
    }
    const scraper = new FreeFireInfoScraper();
    const response = await scraper.search(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
}