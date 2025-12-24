import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  FormData
} from "formdata-node";
import * as cheerio from "cheerio";
class TeraboxDownloader {
  constructor() {
    this.baseUrl = "https://theteradownloader.com";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      referer: this.baseUrl + "/"
    };
  }
  async fetchDownloadPage(url) {
    try {
      const response = await this.client.get(`${this.baseUrl}/download.php?url=${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const downloadUrl = $("input[name='download_url']").val();
      const filename = $("input[name='filename']").val();
      if (!downloadUrl || !filename) {
        throw new Error("Gagal mengekstrak link download.");
      }
      return {
        downloadUrl: downloadUrl,
        filename: filename
      };
    } catch (error) {
      throw new Error(`Gagal mengambil halaman download: ${error.message}`);
    }
  }
  async requestDownload(downloadUrl, filename) {
    try {
      const formData = new FormData();
      formData.append("download_url", downloadUrl);
      formData.append("filename", filename);
      formData.append("start_download", "");
      const response = await this.client.post(`${this.baseUrl}/download.php`, formData, {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded",
          origin: this.baseUrl
        },
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Gagal mengajukan permintaan download: ${error.message}`);
    }
  }
  async getDownloadFile(teraboxUrl) {
    try {
      const {
        downloadUrl,
        filename
      } = await this.fetchDownloadPage(teraboxUrl);
      const finalLink = await this.requestDownload(downloadUrl, filename);
      return {
        buffer: finalLink,
        filename: filename
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.query;
  if (!url) {
    return res.status(400).json({
      error: "Paramenter url wajib diisi"
    });
  }
  try {
    const downloader = new TeraboxDownloader();
    const {
      buffer,
      filename
    } = await downloader.getDownloadFile(url);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.end(buffer);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({
      error: "Gagal mengunduh file"
    });
  }
}