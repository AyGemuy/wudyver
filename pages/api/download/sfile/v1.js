import * as cheerio from "cheerio";
import axios from "axios";
class SfileDownloader {
  constructor(axiosConfig = {}) {
    this.axiosInstance = axios.create({
      ...axiosConfig
    });
  }
  createHeaders(referer) {
    return {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="137", "Google Chrome";v="137"',
      dnt: "1",
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      Referer: referer,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }
  extractCookies(headers) {
    return headers["set-cookie"]?.map(cookie => cookie.split(";")[0]).join("; ") || "";
  }
  extractMetadata($) {
    const clean = text => text?.replace(/^-+\s*/, "").trim() || "N/A";
    const firstListText = $(".file-content .list").first().text().split(" - ");
    const sizeText = $("#download").text().replace(/Download File/g, "").replace(/\(|\)/g, "").trim() || "N/A";
    return {
      file_name: $(".file-content img[alt]").attr("alt")?.trim() || "N/A",
      tags: firstListText[0]?.trim() || "N/A",
      file_type: firstListText[1]?.trim() || "N/A",
      size_from_text: sizeText,
      author_name: $(".file-content .list").eq(1).find("a").text().trim() || "N/A",
      upload_date: clean($(".file-content .list").eq(2).text().replace("Uploaded:", "")),
      download_count: clean($(".file-content .list").eq(3).text().replace("Downloads:", ""))
    };
  }
  async download({
    url,
    output = "json"
  }) {
    if (!url?.startsWith("http")) throw new Error("URL tidak valid.");
    try {
      let headers = this.createHeaders(url);
      const initial = await this.axiosInstance.get(url, {
        headers: headers
      });
      if (initial.status >= 400) throw new Error(`HTTP ${initial.status}`);
      const cookies = this.extractCookies(initial.headers);
      if (cookies) headers.Cookie = cookies;
      let $ = cheerio.load(initial.data);
      const pageMetadata = this.extractMetadata($);
      const downloadUrl = $("#download").attr("href");
      if (!downloadUrl) throw new Error("Link download tidak ditemukan");
      headers.Referer = url;
      const process = await this.axiosInstance.get(downloadUrl, {
        headers: headers
      });
      $ = cheerio.load(process.data);
      const scripts = $("script").map((_, el) => $(el).html()).get().join("\n");
      const urlMatch = scripts.match(/https:\\\/\\\/download\d+\.sfile\.mobi\\\/downloadfile\\\/[^'"]+/gi);
      if (!urlMatch?.length) throw new Error("Link final tidak ditemukan");
      const finalUrl = urlMatch[0].replace(/\\\//g, "/");
      if (output === "buffer") {
        const response = await this.axiosInstance.get(finalUrl, {
          headers: headers,
          responseType: "arraybuffer"
        });
        return {
          metadata: {
            ...pageMetadata,
            size_bytes: response.data.length,
            size_formatted: `${(response.data.length / 1024 / 1024).toFixed(2)} MB`,
            mime_type: response.headers["content-type"] || "application/octet-stream"
          },
          download: response.data
        };
      } else {
        const headResponse = await this.axiosInstance.head(finalUrl, {
          headers: headers
        });
        const contentLength = headResponse.headers["content-length"];
        const fileMeta = {
          size_bytes: contentLength ? parseInt(contentLength) : "Unknown",
          size_formatted: contentLength ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB` : "Unknown",
          mime_type: headResponse.headers["content-type"] || "Unknown"
        };
        return {
          metadata: {
            ...pageMetadata,
            ...fileMeta
          },
          download: finalUrl
        };
      }
    } catch (error) {
      throw new Error(`Download gagal: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Paramenter 'url' dibutuhkan."
    });
  }
  try {
    const api = new SfileDownloader();
    const response = await api.download(params);
    if (params.output === "buffer" && response.download) {
      res.setHeader("Content-Type", response.metadata.mime_type);
      res.setHeader("Content-Disposition", `attachment; filename="${response.metadata.file_name || "downloaded-file"}"`);
      return res.send(response.download);
    }
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}