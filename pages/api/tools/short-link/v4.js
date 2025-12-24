import axios from "axios";
import * as cheerio from "cheerio";
import {
  URLSearchParams
} from "url";
class Shortener {
  constructor() {
    this.baseUrl = "https://savmrl.it";
    this.baseHeaders = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "max-age=0",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://savmrl.it",
      referer: "https://savmrl.it/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    };
  }
  async short({
    url,
    name
  }) {
    console.log(`[PROSES] Memulai penyingkatan untuk URL: ${url}`);
    const defaultValue = {
      id: null,
      url: null,
      qr: null,
      stats: null
    };
    try {
      const formData = new URLSearchParams();
      formData.append("link", url);
      formData.append("openings", "∞");
      formData.append("date", "∞");
      formData.append("access_code", "");
      console.log("[PROSES] Mengirim permintaan POST untuk mendapatkan link pendek...");
      const response = await axios({
        method: "POST",
        url: this.baseUrl,
        data: formData.toString(),
        headers: this.baseHeaders,
        maxRedirects: 10,
        validateStatus: function(status) {
          return status >= 200 && status < 400;
        },
        timeout: 3e4
      });
      console.log(`[PROSES] Response status: ${response.status}`);
      console.log(`[PROSES] Final URL: ${response.request?.responseURL || this.baseUrl}`);
      const $ = cheerio.load(response.data);
      console.log("[DEBUG] Response size:", response.data.length);
      const isHomePage = response.data.includes("Insert your link (URL) here!") || response.data.includes("Generate shortener link") || response.data.includes("The best anonymous and free link shortener");
      if (isHomePage) {
        console.log("[INFO] Masih di halaman utama, mencoba GET method...");
        const getUrl = `${this.baseUrl}/?link=${encodeURIComponent(url)}&openings=∞&date=∞&access_code=`;
        const getResponse = await axios({
          method: "GET",
          url: getUrl,
          headers: {
            ...this.baseHeaders,
            "content-type": undefined
          },
          maxRedirects: 10,
          validateStatus: function(status) {
            return status >= 200 && status < 400;
          },
          timeout: 3e4
        });
        console.log(`[PROSES] GET response status: ${getResponse.status}`);
        if (getResponse.data.includes("Insert your link (URL) here!")) {
          console.log("[GAGAL] GET method juga mengembalikan homepage");
          return defaultValue;
        }
        const $get = cheerio.load(getResponse.data);
        return this.parseResult($get, getResponse.data, name);
      }
      return this.parseResult($, response.data, name);
    } catch (error) {
      console.error(`[ERROR] Kesalahan pada proses penyingkatan:`);
      console.error(`[DETAIL] ${error.message}`);
      if (error.response) {
        console.error(`[DETAIL] Status: ${error.response.status}`);
        console.error(`[DETAIL] Response preview:`, error.response.data?.substring(0, 300));
      }
      return defaultValue;
    }
  }
  parseResult($, htmlData, customName) {
    const defaultValue = {
      id: null,
      url: null,
      qr: null,
      stats: null
    };
    try {
      const linkToCopy = $("#link-input-to-copy").val();
      const statsLink = $("#see-stats-button-link").attr("href");
      const qrCode = $("#qrcode").attr("src");
      let shortId = null;
      if (linkToCopy) {
        const linkMatch = linkToCopy.match(/savmrl\.it\/r\/([^/?]+)/);
        if (linkMatch) {
          shortId = linkMatch[1];
        }
      }
      if (!shortId && statsLink) {
        const statsMatch = statsLink.match(/\/stats\/([^/?]+)/);
        if (statsMatch) {
          shortId = statsMatch[1];
        }
      }
      if (!shortId) {
        const linkMatches = htmlData.match(/https?:\/\/savmrl\.it\/r\/([a-zA-Z0-9]+)/);
        if (linkMatches && linkMatches[1]) {
          shortId = linkMatches[1];
          console.log(`[INFO] ID ditemukan via regex: ${shortId}`);
        }
      }
      console.log(shortId ? `[SUKSES] ID berhasil ditemukan: ${shortId}` : "[GAGAL] Tidak dapat menemukan ID");
      if (!shortId) {
        console.log("[DEBUG] Elements found:");
        console.log("- link-input-to-copy:", $("#link-input-to-copy").length);
        console.log("- see-stats-button-link:", $("#see-stats-button-link").length);
        console.log("- qrcode:", $("#qrcode").length);
        console.log("[DEBUG] HTML preview:", htmlData.substring(0, 500));
        return defaultValue;
      }
      const result = {
        id: shortId,
        url: linkToCopy || `https://savmrl.it/r/${shortId}`,
        qr: qrCode ? qrCode.startsWith("http") ? qrCode : `https://savmrl.it${qrCode}` : null,
        stats: statsLink ? statsLink.startsWith("http") ? statsLink : `https://savmrl.it${statsLink}` : `https://savmrl.it/stats/${shortId}`
      };
      if (customName && shortId) {
        console.log(`[PROSES] Custom name detected: "${customName}". Attempting to change...`);
        return this.editName(result, shortId, customName);
      }
      return result;
    } catch (parseError) {
      console.error(`[ERROR] Error parsing result: ${parseError.message}`);
      return defaultValue;
    }
  }
  async editName(currentResult, oldId, newName) {
    try {
      const editPayload = {
        new_name: newName,
        old_name: oldId
      };
      const apiResponse = await axios({
        method: "POST",
        url: "https://www.savmrl.it/api/v1/link/edit/",
        data: editPayload,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "content-type": "application/json",
          origin: "https://www.savmrl.it",
          priority: "u=1, i",
          referer: "https://www.savmrl.it/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        },
        timeout: 15e3
      });
      const apiData = apiResponse.data;
      console.log("[DEBUG] Edit API Response:", apiData);
      if (apiData?.code === "200" || apiData?.status === "success") {
        const finalName = apiData?.data?.new_name || newName;
        console.log(`[SUKSES] Name berhasil diubah ke: "${finalName}"`);
        return {
          ...currentResult,
          id: finalName,
          url: `https://savmrl.it/r/${finalName}`,
          stats: `https://savmrl.it/stats/${finalName}`
        };
      } else {
        console.warn(`[WARNING] Gagal mengubah nama. Response:`, apiData);
        return currentResult;
      }
    } catch (editError) {
      console.error(`[ERROR] Edit name failed:`, editError.response?.data || editError.message);
      return currentResult;
    }
  }
  async edit(oldName, newName) {
    try {
      const editPayload = {
        new_name: newName,
        old_name: oldName
      };
      const apiResponse = await axios({
        method: "POST",
        url: "https://www.savmrl.it/api/v1/link/edit/",
        data: editPayload,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "content-type": "application/json",
          origin: "https://www.savmrl.it",
          priority: "u=1, i",
          referer: "https://www.savmrl.it/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        },
        timeout: 15e3
      });
      return apiResponse.data;
    } catch (error) {
      console.error(`[ERROR] Edit failed:`, error.response?.data || error.message);
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
    const shortener = new Shortener();
    const response = await shortener.short(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}