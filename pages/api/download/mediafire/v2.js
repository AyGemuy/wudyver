import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
class MFetcher {
  constructor() {
    this.config = {
      apiBase: "https://www.mediafire.com/api/1.5",
      regex: /mediafire\.com\/(?<type>file|folder)\/(?<key>[a-zA-Z0-9]+)/
    };
    this.proxy = proxy;
    this.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";
    console.log("CORS proxy", this.proxy);
  }
  async download({
    url
  }) {
    const match = url.match(this.config.regex);
    if (!match?.groups) {
      throw new Error("URL tidak valid atau tidak didukung. Harap gunakan URL file atau folder Mediafire.");
    }
    const {
      type,
      key
    } = match.groups;
    try {
      if (type === "file") {
        return await this._fetchFileWithScraping({
          url: url
        });
      } else if (type === "folder") {
        return await this._fetchFolderWithApi(key);
      }
    } catch (error) {
      throw new Error(`Gagal memproses ${type} [${key}]: ${error.message}`);
    }
  }
  async _fetchFileWithScraping({
    url
  }) {
    this.log("info", "Memulai pengambilan data file via scraping", {
      url: url
    });
    try {
      const fullUrl = `${this.proxy}${url}`;
      const {
        data
      } = await axios.get(fullUrl, {
        headers: {
          "User-Agent": this.userAgent
        },
        timeout: 2e4
      });
      const $ = cheerio.load(data);
      const downloadButton = $("a#downloadButton");
      const fileInfo = $("div.dl-info");
      if (!downloadButton.length) {
        throw new Error("Tautan unduhan tidak ditemukan. File mungkin telah dihapus.");
      }
      const downloadLink = downloadButton.attr("href");
      if (!downloadLink) {
        throw new Error("Gagal mengekstrak tautan unduhan (href) dari tombol.");
      }
      const result = {
        type: "file",
        name: $(".dl-btn-label").attr("title") || fileInfo.find("div.filename").text().trim(),
        size: downloadButton.text().match(/\((.*?)\)/)?.[1] || fileInfo.find("ul.details li:nth-child(1) span").text().trim() || "N/A",
        url: url,
        download: downloadLink,
        title: $("title").text().trim(),
        uploaded: fileInfo.find("ul.details li:nth-child(2) span").text().trim() || "N/A"
      };
      this.log("info", "Berhasil mengekstrak data file", {
        name: result.name
      });
      return result;
    } catch (error) {
      this.log("error", `Terjadi kesalahan saat memproses file: ${error.message}`, {
        url: url
      });
      throw error;
    }
  }
  async _fetchFolderWithApi(folderKey) {
    this.log("info", "Memulai pengambilan data folder via API", {
      folderKey: folderKey
    });
    const infoResponse = await this._apiRequest("/folder/get_info.php", {
      folder_key: folderKey
    });
    const info = infoResponse.folder_info;
    const files = await this._getFolderContent(folderKey, "files");
    const folders = await this._getFolderContent(folderKey, "folders");
    return {
      type: "folder",
      key: info.folderkey,
      name: info.name,
      created: info.created,
      stats: {
        total_files: files.length,
        total_folders: folders.length
      },
      files: files.map(f => ({
        key: f.quickkey,
        name: f.filename,
        size: parseInt(f.size, 10),
        created: f.created,
        download: f.links.normal_download
      })),
      folders: folders.map(f => ({
        key: f.folderkey,
        name: f.name,
        created: f.created,
        url: `https://www.mediafire.com/folder/${f.folderkey}`
      }))
    };
  }
  async _getFolderContent(folderKey, contentType) {
    let allItems = [];
    let moreChunks = true;
    let chunk = 1;
    while (moreChunks) {
      const response = await this._apiRequest("/folder/get_content.php", {
        folder_key: folderKey,
        content_type: contentType,
        chunk: chunk
      });
      const content = response.folder_content;
      allItems.push(...content[contentType] || []);
      moreChunks = content.more_chunks === "yes";
      chunk++;
    }
    return allItems;
  }
  async _apiRequest(endpoint, params) {
    try {
      const {
        data
      } = await axios.get(`${this.config.apiBase}${endpoint}`, {
        params: {
          ...params,
          response_format: "json"
        },
        timeout: 15e3
      });
      if (data.response.result !== "Success") {
        throw new Error(data.response.message || "Unknown API error");
      }
      return data.response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    }
  }
  log(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const contextString = Object.keys(context).length > 0 ? `| ${JSON.stringify(context)}` : "";
    console[level](`[${timestamp}] [${level.toUpperCase()}] ${message} ${contextString}`);
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
    const api = new MFetcher();
    const response = await api.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}