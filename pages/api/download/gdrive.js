import axios from "axios";
import * as cheerio from "cheerio";
class GoogleDriveDownloader {
  constructor() {
    this.client = axios.create({
      timeout: 3e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
  }
  async download({
    url,
    ...rest
  }) {
    console.log("Memulai proses download...");
    try {
      if (!url?.match(/drive\.google/i)) {
        throw new Error("URL Google Drive tidak valid");
      }
      const result = await this.GDriveDl(url) || await this.drive(url);
      if (!result || result.error) {
        throw new Error("Gagal mendapatkan link download");
      }
      console.log("Download berhasil diproses");
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.log("Error proses download:", error?.message || error);
      return {
        error: true,
        message: error?.message || "Terjadi kesalahan",
        fallback: await this.fallbackDownload(url)
      };
    }
  }
  async GDriveDl(url) {
    console.log("Metode GDriveDl...");
    try {
      const id = (url.match(/\/?id=(.+)/i) || url.match(/\/d\/(.*?)\//))?.[1];
      if (!id) throw new Error("ID tidak ditemukan");
      const response = await this.client.post(`https://drive.google.com/uc?id=${id}&authuser=0&export=download`, null, {
        headers: {
          "accept-encoding": "gzip, deflate, br",
          "content-length": 0,
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          origin: "https://drive.google.com",
          "x-client-data": "CKG1yQEIkbbJAQiitskBCMS2yQEIqZ3KAQioo8oBGLeYygE=",
          "x-drive-first-party": "DriveWebUi",
          "x-json-requested": "true"
        }
      });
      const responseText = response.data;
      const jsonData = JSON.parse(responseText.slice(4));
      const {
        fileName,
        sizeBytes,
        downloadUrl
      } = jsonData || {};
      if (!downloadUrl) throw new Error("Link download limit");
      const fileData = await this.client.head(downloadUrl);
      return {
        downloadUrl: downloadUrl,
        fileName: fileName || "unknown",
        fileSize: this.formatSize(sizeBytes),
        mimetype: fileData?.headers?.["content-type"] || "application/octet-stream"
      };
    } catch (error) {
      console.log("GDriveDl error:", error?.message);
      return null;
    }
  }
  async drive(url) {
    console.log("Metode drive...");
    try {
      if (!url.match(/drive\.google\.com\/file/i)) {
        throw new Error("URL tidak valid");
      }
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      const name = $("head").find('meta[property="og:title"]').attr("content") || "unknown";
      const link = $("head").find('meta[property="og:url"]').attr("content")?.split("?")[0] || url;
      const id = url.match(/file\/d\/([\w\d-]+)/i)?.[1] || "";
      const download = `https://drive.usercontent.google.com/u/0/uc?${new URLSearchParams({
id: id
})}`;
      return {
        name: name || "File",
        link: link || url,
        download: download,
        method: "alternative"
      };
    } catch (error) {
      console.log("Drive method error:", error?.message);
      return null;
    }
  }
  async fallbackDownload(url) {
    console.log("Mencoba fallback...");
    try {
      const id = url.match(/\/d\/([^\/]+)/)?.[1] || url.match(/id=([^&]+)/)?.[1];
      if (!id) return null;
      return {
        directDownload: `https://drive.google.com/uc?export=download&id=${id}`,
        id: id,
        note: "Fallback method - mungkin memerlukan konfirmasi"
      };
    } catch (error) {
      return null;
    }
  }
  formatSize(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + (sizes[i] || "B");
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
    const client = new GoogleDriveDownloader();
    const response = await client.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}