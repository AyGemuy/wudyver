import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class TeraboxAPI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.services = {
      getConfig: {
        method: "GET",
        url: "https://teradl-api.dapuntaratya.com/get_config",
        params: []
      },
      generateFile: {
        method: "POST",
        url: "https://teradl-api.dapuntaratya.com/generate_file",
        params: ["mode", "url"]
      },
      generateLink: {
        method: "POST",
        url: "https://teradl-api.dapuntaratya.com/generate_link",
        params: {
          mode1: ["mode", "js_token", "cookie", "sign", "timestamp", "shareid", "uk", "fs_id"],
          mode2: ["mode", "url"]
        }
      }
    };
  }
  async fetchFiles(url, num) {
    if (!url) throw new Error("URL is required");
    try {
      const {
        method,
        url: apiUrl
      } = this.services.generateFile;
      const fileResponse = await this.client({
        method: method,
        url: apiUrl,
        data: {
          mode: 1,
          url: url
        }
      });
      const {
        js_token,
        cookie,
        sign,
        timestamp,
        shareid,
        uk,
        list
      } = fileResponse.data;
      const filteredList = num ? [list[num - 1]].filter(Boolean) : list;
      const resultArray = await Promise.all(filteredList.map(async x => {
        try {
          const linkMethod = this.services.generateLink.method;
          const linkUrl = this.services.generateLink.url;
          const linkParams = {
            js_token: js_token,
            cookie: cookie,
            sign: sign,
            timestamp: timestamp,
            shareid: shareid,
            uk: uk,
            fs_id: x.fs_id
          };
          const linkResponse = await this.client({
            method: linkMethod,
            url: linkUrl,
            data: linkParams
          });
          return linkResponse.data?.download_link ? {
            fileName: x.name,
            type: x.type,
            thumb: x.image,
            ...linkResponse.data.download_link
          } : null;
        } catch {
          return null;
        }
      }));
      return resultArray.filter(Boolean);
    } catch (e) {
      throw new Error(`Terjadi kesalahan: ${e.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    num
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Parameter `url` wajib disertakan"
    });
  }
  const teraboxAPI = new TeraboxAPI();
  try {
    const result = await teraboxAPI.fetchFiles(url, num);
    return res.status(200).json({
      status: "success",
      service: Object.values(teraboxAPI.services),
      message: "hayo mau ngapain?",
      result: result
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message
    });
  }
}