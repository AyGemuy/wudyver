import axios from "axios";
class TeraboxDownloader {
  constructor() {
    this.client = axios.create({
      withCredentials: true
    });
    this.urlFixer = "https://terabox-url-fixer.mohdamir7505.workers.dev/?url=";
    this.cookies = null;
    this.list = [];
  }
  async getSurl(url) {
    if (!/^https?:\/\//.test(url)) return url;
    try {
      const {
        headers
      } = await this.client.get(url, {
        maxRedirects: 0,
        validateStatus: s => s >= 300 && s < 400
      });
      return new URL(headers.location).searchParams.get("surl") || url;
    } catch {
      return url;
    }
  }
  async getJsToken(mediaId) {
    try {
      const webUrl = `https://www.terabox.app/sharing/embed?surl=${mediaId}`;
      const response = await this.client.get(webUrl);
      const html = response.data;
      const jsTokenMatch = html.match(/"jsToken":"function%20fn%28a%29%7Bwindow.jsToken%20%3D%20a%7D%3Bfn%28%22([^"]+)%22%29/);
      if (!jsTokenMatch) throw new Error("Gagal mengekstrak jsToken");
      this.cookies = response.headers["set-cookie"]?.map(c => c.split(";")[0]).join("; ") || "";
      return jsTokenMatch[1];
    } catch (error) {
      throw new Error(`Error di getJsToken: ${error.message}`);
    }
  }
  async getDownloadLink({
    id,
    shareid,
    uk,
    sign,
    timestamp,
    fs_id
  }) {
    try {
      const jsToken = await this.getJsToken(id);
      const queryString = new URLSearchParams({
        app_id: "250528",
        web: "1",
        channel: "dubox",
        clienttype: "0",
        jsToken: jsToken,
        shareid: shareid,
        uk: uk,
        sign: sign,
        timestamp: timestamp,
        primaryid: shareid,
        product: "share",
        nozip: "0",
        fid_list: `[${fs_id}]`
      }).toString();
      const {
        data
      } = await this.client.get(`https://www.terabox.app/share/download?${queryString}`, {
        headers: {
          Cookie: this.cookies
        }
      });
      if (data.errno !== 0) throw new Error(`Gagal mendapatkan link download | Errno: ${data.errno}`);
      return data.dlink;
    } catch (error) {
      throw new Error(`Error di getDownloadLink: ${error.message}`);
    }
  }
  async getFinalDownloadUrl(dlink) {
    try {
      const response = await this.client.get(dlink, {
        maxRedirects: 0,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        validateStatus: status => status === 302
      });
      return response.headers.location || dlink;
    } catch {
      return dlink;
    }
  }
  async getFileList(shortUrl) {
    try {
      const queryString = new URLSearchParams({
        app_id: "250528",
        shorturl: shortUrl,
        root: "1"
      }).toString();
      const {
        data
      } = await this.client.get(`https://www.terabox.app/api/shorturlinfo?${queryString}`);
      if (data.errno !== 0) throw new Error("Gagal mendapatkan informasi file");
      return {
        shareid: data.shareid,
        uk: data.uk,
        sign: data.sign,
        timestamp: data.timestamp,
        list: data.list
      };
    } catch (error) {
      throw new Error(`Error di getFileList: ${error.message}`);
    }
  }
  async download({
    url: sUrl
  }) {
    try {
      const shortUrl = await this.getSurl(sUrl);
      const fileInfo = await this.getFileList(shortUrl);
      const {
        shareid,
        uk,
        sign,
        timestamp,
        list
      } = fileInfo;
      if (!list.length) throw new Error("Tidak ada file yang tersedia untuk diunduh.");
      const downloadTasks = list.map(async file => {
        if (!file.server_filename) return null;
        console.log(`📥 Mengambil link download untuk ${file.server_filename}`);
        let dlink;
        try {
          dlink = await this.getDownloadLink({
            id: shortUrl,
            shareid: shareid,
            uk: uk,
            sign: sign,
            timestamp: timestamp,
            fs_id: file.fs_id
          });
        } catch {
          console.warn(`⚠️ Gagal mendapatkan link untuk ${file.server_filename}`);
          return null;
        }
        const finalUrl = await this.getFinalDownloadUrl(dlink);
        const fileData = {
          file_name: file.server_filename,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          fs_id: file.fs_id,
          download_url: this.urlFixer + dlink,
          direct_link: this.urlFixer + finalUrl
        };
        this.list.push(fileData);
        return fileData;
      });
      const allFiles = (await Promise.all(downloadTasks)).filter(Boolean);
      return {
        ok: true,
        all_files: allFiles
      };
    } catch (error) {
      return {
        ok: false,
        message: `Error di processFiles: ${error.message}`
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
  const api = new TeraboxDownloader();
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