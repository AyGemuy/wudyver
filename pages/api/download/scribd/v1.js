import axios from "axios";
import * as cheerio from "cheerio";
class ScribdDownloader {
  getId(url) {
    try {
      const match = url.match(/(?:doc|document|embeds)\/(\d+)/);
      const id = match ? match[1] : null;
      console.log(`[LOG] Extracted ID: ${id || "Failed"}`);
      return id;
    } catch (err) {
      console.error(`[ERR] Error extracting ID: ${err.message}`);
      return null;
    }
  }
  async req(url) {
    try {
      console.log(`[LOG] Fetching: ${url}`);
      const {
        data
      } = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://www.scribd.com/"
        },
        timeout: 15e3
      });
      return data;
    } catch (err) {
      console.error(`[ERR] Request Failed: ${url} - ${err.message}`);
      return null;
    }
  }
  extractJsonpUrls(html) {
    try {
      const regex = /https?:\/\/[^"'\s]+\.jsonp/g;
      const matches = html.match(regex) || [];
      const unique = [...new Set(matches)];
      console.log(`[LOG] Found ${unique.length} JSONP URLs.`);
      return unique;
    } catch (err) {
      console.error(`[ERR] Regex JSONP failed: ${err.message}`);
      return [];
    }
  }
  extractAbsImages($) {
    try {
      const images = [];
      $(".absimg").each((i, el) => {
        const src = $(el).attr("src") || $(el).attr("orig") || $(el).attr("data-src");
        if (src && src.startsWith("http")) images.push(src);
      });
      console.log(`[LOG] Fallback found ${images.length} images via .absimg`);
      return [...new Set(images)];
    } catch (err) {
      console.error(`[ERR] Fallback absimg failed: ${err.message}`);
      return [];
    }
  }
  async processTextSequential(jsonpUrls) {
    console.log(`[LOG] Starting Sequential Text Extraction for ${jsonpUrls.length} pages...`);
    let fullText = "";
    for (const url of jsonpUrls) {
      try {
        const rawData = await this.req(url);
        if (!rawData) continue;
        const cleanHtml = rawData.replace(/^[a-zA-Z0-9_.]+\(\[?"/, "").replace(/"\]?\);?$/, "").replace(/\\n/g, "").replace(/\\/g, "");
        const $ = cheerio.load(cleanHtml);
        let pageText = "";
        $("span.a").each((_, el) => {
          pageText += $(el).text() + "\n";
        });
        fullText += pageText + "\n\n--- PAGE BREAK ---\n\n";
      } catch (err) {
        console.error(`[ERR] Error processing text URL: ${url} - ${err.message}`);
      }
    }
    return fullText;
  }
  async download({
    url,
    mode = "img"
  }) {
    console.log(`[LOG] Starting Download. Mode: ${mode.toUpperCase()}`);
    try {
      const id = this.getId(url);
      if (!id) throw new Error("ID not found");
      const targetUrl = `https://www.scribd.com/embeds/${id}/content`;
      const html = await this.req(targetUrl);
      if (!html) throw new Error("HTML empty");
      const $ = cheerio.load(html);
      const title = $("title").text().replace(" - Scribd", "").trim();
      const jsonpUrls = this.extractJsonpUrls(html);
      let resultData = {};
      if (mode === "txt") {
        let textContent = "";
        if (jsonpUrls.length > 0) {
          textContent = await this.processTextSequential(jsonpUrls);
        } else {
          console.log(`[LOG] JSONP Text not found. Fallback to static HTML text.`);
          $(".text_layer").each((_, layer) => {
            textContent += $(layer).text() + "\n";
          });
        }
        resultData = {
          type: "text",
          content: textContent || "No text content found."
        };
      } else {
        let images = [];
        if (jsonpUrls.length > 0) {
          console.log(`[LOG] Using JSONP Replacement for Images.`);
          for (const u of jsonpUrls) {
            const imgUrl = u.replace("/pages/", "/images/").replace(".jsonp", ".jpg");
            images.push(imgUrl);
          }
        } else {
          console.log(`[LOG] Using Cheerio .absimg Fallback.`);
          images = this.extractAbsImages($);
        }
        resultData = {
          type: "images",
          total: images.length,
          urls: images
        };
      }
      return {
        success: true,
        id: id,
        title: title,
        ...resultData
      };
    } catch (err) {
      console.error(`[CRITICAL] ${err.message}`);
      return {
        success: false,
        error: err.message
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
  const api = new ScribdDownloader();
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