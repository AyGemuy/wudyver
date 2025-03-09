import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class TeraboxDownAPI {
  constructor() {
    this.baseURL = "https://teraboxdown.xyz/api";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=1, i",
      referer: "https://teraboxdown.xyz/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getFileInfo(shorturl, pwd = "") {
    try {
      const response = await this.client.get(`${this.baseURL}/get-info`, {
        headers: this.headers,
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
          ...this.headers,
          "content-type": "application/json",
          origin: "https://teraboxdown.xyz"
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Terjadi kesalahan: ${error.message}`);
    }
  }
  async fetchFiles(shorturl, pwd, num, isPremium = false) {
    try {
      const fileInfo = await this.getFileInfo(shorturl, pwd);
      const {
        shareid,
        uk,
        sign,
        timestamp,
        list
      } = fileInfo;
      if (!list.length) throw new Error("Tidak ada file yang tersedia.");
      const filteredList = num ? [list[num - 1]].filter(Boolean) : list;
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
      error: "Parameter `url` wajib disertakan"
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