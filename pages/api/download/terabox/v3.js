import axios from "axios";
class TeraboxAPI {
  async fetchFiles(url, num) {
    if (!url) throw new Error("URL is required");
    try {
      const fileResponse = await axios.post("https://teradl-api.dapuntaratya.com/generate_file", {
        mode: 1,
        url: url
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
        const linkResponse = await axios.post("https://teradl-api.dapuntaratya.com/generate_link", {
          js_token: js_token,
          cookie: cookie,
          sign: sign,
          timestamp: timestamp,
          shareid: shareid,
          uk: uk,
          fs_id: x.fs_id
        }).catch(() => ({}));
        return linkResponse.data?.download_link ? {
          fileName: x.name,
          type: x.type,
          thumb: x.image,
          ...linkResponse.data.download_link
        } : null;
      }));
      return resultArray.filter(Boolean);
    } catch (e) {
      throw new Error(e.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    num
  } = req.method === "GET" ? req.query : req.body;
  const teraboxAPI = new TeraboxAPI();
  try {
    const result = await teraboxAPI.fetchFiles(url, num);
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
}