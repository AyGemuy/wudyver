import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class MediafireDownloader {
  constructor() {
    this.apiBase = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v12?url=`;
    this.userAgent = "Mozilla/5.0 (Linux; Android 12; SM-G996B Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/113.0.5672.162 Mobile Safari/537.36";
  }
  normalizeFileOrFolderName(filename) {
    return filename.replace(/[^\w-_. ]/g, "-");
  }
  async download(mediafireUrl) {
    const match = mediafireUrl.match(/mediafire\.com\/(folder|file|file_premium)\/([a-zA-Z0-9]+)/);
    if (!match) {
      console.log(`Invalid link: ${mediafireUrl}`);
      return {
        error: "Invalid Mediafire URL"
      };
    }
    const [_, type, key] = match;
    return type === "file" || type === "file_premium" ? await this.downloadFile(key, mediafireUrl) : await this.downloadFolder(key, mediafireUrl);
  }
  async downloadFile(key, mediafireUrl) {
    try {
      const response = await axios.get(`${this.apiBase}${mediafireUrl}`, {
        headers: {
          "User-Agent": this.userAgent
        }
      });
      const $ = cheerio.load(response.data);
      const link = $("#downloadButton").attr("href");
      if (!link) {
        return {
          error: "Gagal mendapatkan link download dari halaman.",
          source_html: response.data
        };
      }
      return {
        key: key,
        url: mediafireUrl,
        direct_link: link
      };
    } catch (error) {
      console.error(`Error downloading file: ${error.message}`);
      return {
        error: "Terjadi kesalahan saat mendownload file.",
        details: error.message
      };
    }
  }
  async downloadFolder(key, mediafireUrl) {
    try {
      const folderInfo = await this.getFolderInfo(key, mediafireUrl);
      return {
        key: key,
        url: mediafireUrl,
        folder_info: folderInfo
      };
    } catch (error) {
      console.error(`Error downloading folder: ${error.message}`);
      return {
        error: "Terjadi kesalahan saat mendownload folder.",
        details: error.message
      };
    }
  }
  async getFolderInfo(folderKey, mediafireUrl) {
    try {
      const response = await axios.get(`${this.apiBase}${mediafireUrl}`, {
        headers: {
          "User-Agent": this.userAgent
        }
      });
      const $ = cheerio.load(response.data);
      const results = [];
      $("li.row_container").each((_, el) => {
        const elmt = $(el);
        const name = elmt.find(".item-name").text().trim() || "Unknown Name";
        const link = elmt.find(".foldername, .filetype_column").attr("href") || "Unknown Link";
        const size = elmt.find(".file_maindetails .size").text().trim() || "Unknown Size";
        const date = elmt.find(".file_maindetails .created").text().trim() || "Unknown Date";
        const type = elmt.hasClass("folder") ? "folder" : "file";
        if (link) {
          results.push({
            name: name,
            link: link,
            type: type,
            size: size,
            date: date
          });
        }
      });
      return results.length ? results : {
        empty: true,
        message: "Tidak ada file/folder ditemukan."
      };
    } catch (error) {
      console.error(`Error fetching folder info: ${error.message}`);
      throw new Error("Gagal mengambil informasi folder.");
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
  try {
    const downloader = new MediafireDownloader();
    const result = await downloader.download(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}