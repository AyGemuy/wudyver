import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class YouTubeDownloader {
  constructor() {}
  async getLinks({
    url
  }) {
    console.log(`[PROCESS] Starting download link retrieval for YouTube URL: ${url}`);
    const siteKey = "0x4AAAAAAAzuNQE5IJEnuaAp";
    const bypassApiUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`;
    try {
      console.log("[PROCESS] Step 1: Generating MurmurHash...");
      const mhash = this._murmurHash64(url);
      console.log(`[DEBUG] MurmurHash: ${mhash}`);
      const targetApiUrl = `https://ssyoutube.rip/mates/en/analyze/ajax?retry=undefined&platform=youtube&mhash=${mhash}`;
      console.log("[PROCESS] Step 1 completed.");
      console.log("[PROCESS] Step 2: Getting Turnstile token...");
      const cfToken = await this._getTurnstileToken(bypassApiUrl, "https://ssyoutube.rip/en-a1/", siteKey);
      console.log("[PROCESS] Step 2 completed: Turnstile token obtained.");
      console.log("[PROCESS] Step 3: Requesting download links and parsing response...");
      const downloadData = await this._fetchAndParseLinks(targetApiUrl, url, cfToken);
      console.log("[PROCESS] Step 3 completed.");
      console.log("[PROCESS] Download link retrieval process completed successfully.");
      return downloadData;
    } catch (error) {
      console.error(`[ERROR] Download link retrieval failed: ${error.message}`);
      return null;
    }
  }
  _murmurHash64(str) {
    let h1 = 3735928559;
    let h2 = 1103547991;
    for (let i = 0; i < str.length; i++) {
      const k = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ k, 2246822507);
      h2 = Math.imul(h2 ^ k, 3266489909);
    }
    h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
    h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
    const h1Hex = (h1 >>> 0).toString(16).padStart(8, "0");
    const h2Hex = (h2 >>> 0).toString(16).padStart(8, "0");
    return h1Hex + h2Hex;
  }
  async _getTurnstileToken(apiUrl, targetUrl, siteKey) {
    try {
      console.log(`[DEBUG] Requesting Turnstile token from ${apiUrl} for URL: ${targetUrl}, SiteKey: ${siteKey}`);
      const tokenResponse = await axios.get(apiUrl, {
        params: {
          url: targetUrl,
          sitekey: siteKey
        },
        headers: {
          Accept: "application/json"
        }
      });
      if (!tokenResponse.data?.status) {
        throw new Error(tokenResponse.data.message || "Turnstile bypass API returned an error.");
      }
      if (!tokenResponse.data?.data?.token) {
        throw new Error("Token not found in API response data.");
      }
      return tokenResponse.data.token;
    } catch (error) {
      console.error(`[ERROR] _getTurnstileToken failed: ${error.message}`);
      throw error;
    }
  }
  async _fetchAndParseLinks(targetApiUrl, youtubeUrl, cfToken) {
    try {
      console.log(`[DEBUG] Posting data to ${targetApiUrl} with YouTube URL and CF token.`);
      const requestBody = new URLSearchParams({
        url: youtubeUrl,
        ajax: "1",
        lang: "en",
        cftoken: cfToken
      });
      const headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
      };
      const finalResponse = await axios.post(targetApiUrl, requestBody.toString(), {
        headers: headers
      });
      if (finalResponse.data && typeof finalResponse.data.result === "string") {
        const $ = cheerio.load(finalResponse.data.result);
        const title = $("#video_title").text().trim();
        if (!title) {
          throw new Error("Failed to parse HTML. Page structure might have changed or no title found.");
        }
        const apiOutput = {
          status: "success",
          metadata: {
            title: title,
            duration: $("p.m-b-0.m-t").text().replace("Duration:", "").trim(),
            thumbnail: $("img.img-thumbnail").attr("src")
          },
          downloads: {
            video: [],
            audio: []
          }
        };
        let currentSection = "";
        $("table tr").each((index, element) => {
          const row = $(element);
          if (row.find("strong").length > 0) {
            currentSection = row.find("strong").text().trim().toLowerCase();
            return;
          }
          const columns = row.find("td");
          if (columns.length === 3) {
            const downloadButton = $(columns[2]).find("a, button");
            const url = downloadButton.attr("href") || downloadButton.data("url");
            if (url) {
              const format = {
                url: url,
                quality: $(columns[0]).text().trim().replace(/\s+/g, " "),
                ext: downloadButton.data("ftype"),
                size: $(columns[1]).text().trim()
              };
              if (currentSection === "video") {
                format.hasAudio = !row.hasClass("noaudio");
                apiOutput.downloads.video.push(format);
              } else if (currentSection === "audio") {
                apiOutput.downloads.audio.push(format);
              }
            }
          }
        });
        console.log(`[DEBUG] Parsed ${apiOutput.downloads.video.length} video links and ${apiOutput.downloads.audio.length} audio links.`);
        return apiOutput;
      } else {
        throw new Error("Failed to get data from ssyoutube.rip. Server response did not have the expected format.");
      }
    } catch (error) {
      console.error(`[ERROR] _fetchAndParseLinks failed: ${error.message}`);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new YouTubeDownloader();
    const result = await downloader.getLinks(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}