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
class TeraboxLinkDownloader {
  constructor(hostIndex = 1) {
    this.hosts = ["teradownloaderr.com", "teraboxlinkdownloader.com", "teraboxdownloaders.net"];
    this.selectedHost = this.hosts[hostIndex] || this.hosts[1];
    this.baseUrl = `https://${this.selectedHost}/wp-admin/admin-ajax.php`;
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: `https://${this.selectedHost}`,
      referer: `https://${this.selectedHost}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async fetchDownloadLink(teraboxUrl) {
    try {
      const formData = new FormData();
      formData.append("action", "terabox_download");
      formData.append("url", teraboxUrl);
      const {
        data
      } = await this.client.post(this.baseUrl, formData, {
        headers: this.headers
      });
      if (!data) throw new Error("Gagal mendapatkan link download.");
      return data;
    } catch (error) {
      throw new Error(`Gagal mendapatkan link: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    host = 1
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Parameter `url` wajib disertakan"
    });
  }
  const hostIndex = parseInt(host, 10);
  const terabox = new TeraboxLinkDownloader(hostIndex);
  try {
    const result = await terabox.fetchDownloadLink(url);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error during processing:", error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan server"
    });
  }
}