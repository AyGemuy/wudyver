import axios from "axios";
import AdmZip from "adm-zip";
export default async function handler(req, res) {
  let urls;
  if (req.method === "GET") {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        error: "No image URLs provided"
      });
    }
    urls = url.split(",").map(url => url.trim());
  } else if (req.method === "POST") {
    urls = Array.isArray(req.body?.url) ? req.body.url : [req.body?.url];
  }
  if (!urls || urls.length === 0) {
    return res.status(400).json({
      error: "No valid URLs provided"
    });
  }
  try {
    const zip = new AdmZip();
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const fileName = `file${i + 1}${url.substring(url.lastIndexOf("."))}`;
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      zip.addFile(fileName, response.data);
    }
    const zipBuffer = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=media.zip");
    return res.status(200).send(zipBuffer);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}