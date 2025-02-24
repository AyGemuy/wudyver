import axios from "axios";
class Web2zipService {
  constructor() {
    this.apiUrl = "https://copier.saveweb2zip.com";
  }
  async saveWebsiteToZip(url, rename = false, structure = false, altAlgo = false, mobile = false) {
    let attempts = 0;
    let md5;
    try {
      const copyResponse = await axios.post(`${this.apiUrl}/api/copySite`, {
        url: url,
        renameAssets: rename,
        saveStructure: structure,
        alternativeAlgorithm: altAlgo,
        mobileVersion: mobile
      }, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
          Referer: "https://saveweb2zip.com/en"
        }
      });
      const copyResult = copyResponse.data;
      md5 = copyResult?.md5;
      if (!md5) throw new Error("Failed to retrieve MD5 hash");
      while (attempts < 10) {
        const statusResponse = await axios.get(`${this.apiUrl}/api/getStatus/${md5}`, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
            Referer: "https://saveweb2zip.com/en"
          }
        });
        const statusResult = statusResponse.data;
        if (statusResult.isFinished) {
          const downloadResponse = await axios.get(`${this.apiUrl}/api/downloadArchive/${md5}`, {
            responseType: "arraybuffer",
            headers: {
              "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
              Referer: "https://saveweb2zip.com/en"
            }
          });
          const buffer = Buffer.from(downloadResponse.data);
          return {
            name: `${md5}.zip`,
            media: buffer.toString("base64"),
            link: `${this.apiUrl}/api/downloadArchive/${md5}`
          };
        }
        await new Promise(resolve => setTimeout(resolve, 6e4));
        attempts++;
      }
      throw new Error("Timeout: Max attempts reached without completion");
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    rename = false,
    structure = false,
    altAlgo = false,
    mobile = false,
    output = "link"
  } = req.query;
  if (!url) return res.status(400).json({
    message: "No link provided"
  });
  const web2zipService = new Web2zipService();
  const result = await web2zipService.saveWebsiteToZip(url, rename, structure, altAlgo, mobile);
  if (!result) return res.status(500).json({
    message: "Failed to process the link"
  });
  if (output === "link") {
    return res.status(200).json({
      link: result.link
    });
  }
  if (output === "media") {
    res.setHeader("Content-Disposition", `attachment; filename="${result.name}"`);
    res.setHeader("Content-Type", "application/zip");
    return res.status(200).send(Buffer.from(result.media, "base64"));
  }
  return res.status(400).json({
    message: "Invalid output parameter, must be 'link' or 'media'"
  });
}