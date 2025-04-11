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
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.apiBase = `https://${process.env.DOMAIN_URL}/api/tools/web/html/v1?url=`;
  }
  normalizeFileOrFolderName(filename) {
    return filename.replace(/[^\w-_. ]/g, "-");
  }
  async download(mediafireUrl) {
    const match = mediafireUrl.match(/mediafire\.com\/(folder|file|file_premium)\/([a-zA-Z0-9]+)/);
    if (!match) return console.log(`Invalid link: ${mediafireUrl}`);
    const [_, type, key] = match;
    return type === "file" || type === "file_premium" ? await this.downloadFile(key, mediafireUrl) : await this.downloadFolder(key, mediafireUrl);
  }
  async downloadFile(key, mediafireUrl) {
    try {
      const {
        data
      } = await this.getFileData(key);
      const response = await this.client.get(this.apiBase + data.response.file_info.links.normal_download);
      const $ = cheerio.load(response.data);
      const link = $("#downloadButton").attr("href") || null;
      if (!link) return {
        error: "Gagal mendapatkan link download."
      };
      return {
        key: key,
        url: mediafireUrl,
        direct_link: link,
        file_info: data.response.file_info
      };
    } catch (error) {
      console.error(`Error downloading file: ${error.message}`);
      return {
        error: "Terjadi kesalahan saat mendownload file."
      };
    }
  }
  async downloadFolder(key, mediafireUrl) {
    try {
      const folderInfo = await this.getFolderInfo(key);
      return {
        key: key,
        url: mediafireUrl,
        folder_info: folderInfo
      };
    } catch (error) {
      console.error(`Error downloading folder: ${error.message}`);
      return {
        error: "Terjadi kesalahan saat mendownload folder."
      };
    }
  }
  getInfoEndpoint(fileKey) {
    return `https://www.mediafire.com/api/file/get_info.php?quick_key=${fileKey}&response_format=json`;
  }
  async getFileData(fileKey) {
    return await this.client.get(this.getInfoEndpoint(fileKey));
  }
  async getFolderInfo(folderKey) {
    const filesInfo = [];
    let chunk = 1,
      moreChunks = true,
      folderData = null;
    while (moreChunks) {
      const {
        data
      } = await this.client.get(this.getFilesOrFoldersApiEndpoint("files", folderKey, chunk));
      moreChunks = data.response.folder_content.more_chunks === "yes";
      if (!folderData) folderData = data.response.folder_content;
      for (const file of data.response.folder_content.files) {
        const fileData = await this.getFileData(file.quickkey);
        filesInfo.push(fileData.data.response.file_info);
      }
      chunk++;
    }
    return {
      ...folderData,
      files: filesInfo
    };
  }
  getFilesOrFoldersApiEndpoint(filefolder, folderKey, chunk = 1) {
    return `https://www.mediafire.com/api/1.4/folder/get_content.php?r=utga&content_type=${filefolder}&chunk=${chunk}&folder_key=${folderKey}&response_format=json`;
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
    res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}