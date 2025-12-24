import axios from "axios";
class MFetcher {
  constructor() {
    this.api = "https://www.mediafire.com/api/1.5";
  }
  async download({
    url
  }) {
    try {
      if (!url.includes("mediafire.com")) throw new Error("Bukan URL MediaFire");
      const fileMatch = url.match(/mediafire\.com\/file\/([a-z0-9]+)/i);
      if (fileMatch) return await this.getFileInfo(fileMatch[1]);
      const folderMatch = url.match(/mediafire\.com\/folder\/([a-z0-9]+)/i);
      if (folderMatch) return await this.getFolderContent(folderMatch[1]);
      throw new Error("URL tidak dikenali sebagai file atau folder");
    } catch (err) {
      throw new Error("Gagal ambil data: " + err.message);
    }
  }
  async getFileInfo(quickKey) {
    const {
      data
    } = await axios.get(`${this.api}/file/get_info.php`, {
      params: {
        quick_key: quickKey,
        response_format: "json"
      }
    });
    const info = data?.response?.file_info;
    if (!info || info.ready !== "yes") throw new Error("File tidak tersedia");
    return {
      type: "file",
      name: info.filename,
      size: +info.size,
      mimetype: info.mimetype,
      created: info.created,
      download: info.links.normal_download
    };
  }
  async getFolderContent(folderKey) {
    const {
      data
    } = await axios.get(`${this.api}/folder/get_content.php`, {
      params: {
        folder_key: folderKey,
        response_format: "json",
        content_type: "files",
        filter: "all",
        order_by: "name",
        order_direction: "asc",
        chunk: 1,
        version: "1.5",
        r: Math.random().toString(36).slice(2)
      }
    });
    const files = data?.response?.folder_content?.files || [];
    return {
      type: "folder",
      total: files.length,
      files: files.map(f => ({
        name: f.filename,
        size: +f.size,
        mimetype: f.mimetype,
        created: f.created,
        download: f.links.normal_download
      }))
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Paramenter 'url' dibutuhkan."
    });
  }
  try {
    const api = new MFetcher();
    const response = await api.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}