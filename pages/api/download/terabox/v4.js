import axios from "axios";
class Terabox {
  constructor() {
    this.headers = {
      authority: "api.sylica.eu.org",
      origin: "https://www.kauruka.com",
      referer: "https://www.kauruka.com/",
      "user-agent": "Postify/1.0.0"
    };
  }
  extractId(url) {
    const match = url.match(/s\/([a-zA-Z0-9]+)$|surl=([a-zA-Z0-9]+)$/);
    return match ? match[1] || match[2] : null;
  }
  parseRes(data, includeDL = false) {
    const response = {
      filename: data.filename,
      size: data.size,
      shareid: data.shareid,
      uk: data.uk,
      sign: data.sign,
      timestamp: data.timestamp,
      createTime: data.create_time,
      fsId: data.fs_id,
      message: data.message || "Gak tau 🙂‍↔️"
    };
    if (includeDL) {
      response.dlink = data.downloadLink;
    }
    return response;
  }
  async fetchData(url, download) {
    try {
      const id = this.extractId(url);
      if (!id) {
        throw new Error("Masukin url terabox yang valid");
      }
      const url = `https://api.sylica.eu.org/terabox/?id=${id}${download ? "&download=1" : ""}`;
      const {
        data
      } = await axios.get(url, {
        headers: this.headers
      });
      return this.parseRes(data.data, Boolean(download));
    } catch (error) {
      console.error("Error fetching data:", error);
      throw new Error(error.response?.data?.message || "Terjadi kesalahan saat mengambil data");
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    download
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Parameter `url` wajib disertakan"
    });
  }
  const terabox = new Terabox();
  try {
    const result = await terabox.fetchData(url, download);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error during processing:", error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan server"
    });
  }
}