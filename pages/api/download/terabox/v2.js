import axios from "axios";
class TeraboxAPI {
  async getInfo(inputUrl) {
    try {
      const url = `https://terabox.hnn.workers.dev/api/get-info?shorturl=${inputUrl.split("/").pop()}&pwd=`;
      const headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
        Referer: "https://terabox.hnn.workers.dev/"
      };
      const response = await axios.get(url, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error("Gagal mengambil informasi file:", error);
      throw new Error(`Gagal mengambil informasi file: ${error.response?.status} ${error.response?.statusText}`);
    }
  }
  async getDownloadLink(fsId, shareid, uk, sign, timestamp) {
    try {
      const url = "https://terabox.hnn.workers.dev/api/get-download";
      const headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
        Referer: "https://terabox.hnn.workers.dev/"
      };
      const data = {
        shareid: shareid,
        uk: uk,
        sign: sign,
        timestamp: timestamp,
        fs_id: fsId
      };
      const response = await axios.post(url, data, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error("Gagal mengambil link download:", error);
      throw new Error(`Gagal mengambil link download: ${error.response?.status} ${error.response?.statusText}`);
    }
  }
  async download(inputUrl, num) {
    try {
      const {
        list,
        shareid,
        uk,
        sign,
        timestamp
      } = await this.getInfo(inputUrl);
      if (!list || list.length === 0) {
        throw new Error("Tidak ada file ditemukan.");
      }
      const filteredList = num ? [list[num - 1]].filter(Boolean) : list;
      const downloadPromises = filteredList.map(async file => {
        const fsId = file.fs_id;
        const {
          downloadLink
        } = await this.getDownloadLink(fsId, shareid, uk, sign, timestamp);
        return downloadLink;
      });
      const downloadLinks = await Promise.all(downloadPromises);
      return downloadLinks;
    } catch (error) {
      console.error("Gagal mengunduh file:", error);
      throw new Error(`Gagal mengunduh file: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    type,
    num
  } = req.method === "GET" ? req.query : req.body;
  if (!(url || type)) {
    return res.status(400).json({
      message: "No url, type provided"
    });
  }
  const terabox = new TeraboxAPI();
  try {
    const result = type && type === "info" ? await terabox.getInfo(url) : await terabox.download(url, num);
    return res.status(200).json(typeof result === "object" ? result : result);
  } catch (error) {
    console.error("Error during processing:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}