import axios from "axios";
class TeraboxDownAPI {
  constructor() {
    this.baseURL = "https://teradownloader.online/proxy.php?target=https://terabox.hnn.workers.dev/api";
    this.urlFixer = "https://terabox-url-fixer.mohdamir7505.workers.dev/?url=";
    this.client = axios.create({
      withCredentials: false,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        priority: "u=1, i",
        referer: "https://terabox.hnn.workers.dev/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
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
  async getFileInfo(shorturl, pwd = "") {
    try {
      const response = await this.client.get(`${this.baseURL}/get-info`, {
        params: {
          shorturl: shorturl,
          pwd: pwd
        }
      });
      if (!response.data.ok) throw new Error("Gagal mendapatkan informasi file.");
      return response.data;
    } catch (error) {
      throw new Error(`Terjadi kesalahan: ${error.message}`);
    }
  }
  async getDownloadLink({
    shareid,
    uk,
    sign,
    timestamp,
    fs_id
  }, isPremium = false) {
    try {
      const endpoint = isPremium ? "get-downloadp" : "get-download";
      const response = await this.client.post(`${this.baseURL}/${endpoint}`, {
        shareid: shareid,
        uk: uk,
        sign: sign,
        timestamp: timestamp,
        fs_id: fs_id
      }, {
        headers: {
          "content-type": "application/json",
          origin: "https://terabox.hnn.workers.dev"
        }
      });
      if (!response.data.downloadLink) throw new Error("Gagal mendapatkan link unduhan.");
      return {
        url: `${this.urlFixer}${response.data.downloadLink}`
      };
    } catch (error) {
      throw new Error(`Terjadi kesalahan: ${error.message}`);
    }
  }
  async fetchFiles(sUrl, pwd, num, isPremium = false) {
    try {
      const shorturl = await this.getSurl(sUrl);
      const fileInfo = await this.getFileInfo(shorturl, pwd);
      const {
        shareid,
        uk,
        sign,
        timestamp,
        list
      } = fileInfo;
      if (!list.length) throw new Error("Tidak ada file yang tersedia.");
      const getAllFiles = items => {
        let files = [];
        items.forEach(item => {
          if (item.is_dir === "1" && item.children) {
            files = files.concat(getAllFiles(item.children));
          } else {
            files.push(item);
          }
        });
        return files;
      };
      const allFiles = getAllFiles(list);
      const filteredList = num ? [allFiles[num - 1]].filter(Boolean) : allFiles;
      const downloadLinks = await Promise.all(filteredList.map(async file => {
        const linkData = await this.getDownloadLink({
          shareid: shareid,
          uk: uk,
          sign: sign,
          timestamp: timestamp,
          fs_id: file.fs_id
        }, isPremium);
        return {
          fileName: file.filename,
          size: file.size,
          ...linkData
        };
      }));
      return downloadLinks;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    pwd = "",
    num,
    alt = false
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Paramenter `url` wajib disertakan"
    });
  }
  const teraboxDownAPI = new TeraboxDownAPI();
  try {
    const result = await teraboxDownAPI.fetchFiles(url, pwd, num, alt);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}