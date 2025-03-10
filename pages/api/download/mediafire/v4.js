import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class MediafireDownloader {
  constructor() {
    this.apiBase = `https://${process.env.DOMAIN_URL}/api/tools/web/html/v1?url=`;
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
  }
  async fetchPage(url) {
    try {
      const {
        data
      } = await this.client.get(`${this.apiBase}${encodeURIComponent(url)}`);
      return cheerio.load(data);
    } catch (error) {
      throw new Error("Gagal mengambil halaman.");
    }
  }
  async fetchPageFolder(url) {
    try {
      const {
        data
      } = await this.client.get(url);
      return cheerio.load(data);
    } catch (error) {
      throw new Error("Gagal mengambil halaman.");
    }
  }
  isFolder(url) {
    return /mediafire\.com\/folder\/([^/?]+)/.test(url);
  }
  async waitForElement($, selector, timeout = 12e4) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if ($(selector).length) return true;
      await new Promise(res => setTimeout(res, 2e3));
    }
    return false;
  }
  async getFolderContents($) {
    const ready = await this.waitForElement($, "li.row_container");
    if (!ready) return {
      error: "Timeout mendapatkan daftar folder/file."
    };
    const results = [];
    $("li.row_container").each((_, el) => {
      const elmt = $(el);
      const name = elmt.find(".item-name").text().trim() || "Unknown Name";
      const link = elmt.find(".foldername, .filetype_column").attr("href") || "Unknown Link";
      const size = elmt.find(".file_maindetails .size").text().trim() || "Unknown Size";
      const date = elmt.find(".file_maindetails .created").text().trim() || "Unknown Date";
      const key = elmt.attr("data-key") || "Unknown Key";
      const type = elmt.hasClass("folder") ? "folder" : "file";
      if (link) {
        results.push({
          name: name,
          link: link,
          key: key,
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
  }
  async getFileDownloadLink($) {
    const ready = await this.waitForElement($, "#downloadButton");
    if (!ready) return {
      error: "Timeout mendapatkan link download."
    };
    const name = $(".dl-btn-label").text().trim() || "Unknown File";
    const link = $("#downloadButton").attr("href") || "Unknown Link";
    const size = $("#downloadButton").text().match(/\((.*?)\)/)?.[1]?.trim() || "Unknown Size";
    const key = link ? link.match(/\/([^/]+)\/[^/]+$/)?.[1] || "Unknown Key" : "Unknown Key";
    return link ? {
      name: name,
      link: link,
      key: key,
      type: "file",
      size: size
    } : {
      error: "Gagal mendapatkan link download."
    };
  }
  async download(url) {
    try {
      const $ = this.isFolder(url) ? await this.fetchPageFolder(url) : await this.fetchPage(url);
      return this.isFolder(url) ? await this.getFolderContents($) : await this.getFileDownloadLink($);
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: "URL is required"
  });
  try {
    const downloader = new MediafireDownloader();
    const result = await downloader.download(url);
    res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}