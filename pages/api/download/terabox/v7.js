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
class TeraboxDownloader {
  constructor({
    host: hostIndex = 1
  }) {
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
  async download({
    url: teraboxUrl
  }) {
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
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new TeraboxDownloader(params);
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