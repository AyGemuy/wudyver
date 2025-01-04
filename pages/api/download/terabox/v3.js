import axios from "axios";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({
    error: "Method Not Allowed"
  });
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: "URL is required"
  });
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
    const resultArray = await Promise.all(list.map(async x => {
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
    res.status(200).json(resultArray.filter(Boolean));
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
}