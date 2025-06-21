import axios from "axios";
import * as cheerio from "cheerio";
class Qiwi {
  async dl(link) {
    const getFileId = link => link.split("/").pop();
    const fetch = async link => {
      const {
        data
      } = await axios.get(link);
      const $ = cheerio.load(data);
      const fileName = $("h1.page_TextHeading__VsM7r").text().trim();
      const uploader = $("p.page_TextSubHeading__IzKQv").text().replace("Uploaded by ", "").trim();
      const size = $("div.page_Links__vy_Lc").text().match(/Download\s+([\d.]+\s+[A-Z]+)/)?.[1] || "Kagak tau 🙂‍↔️";
      return {
        fileName: fileName,
        uploader: uploader,
        size: size
      };
    };
    const fileId = getFileId(link);
    if (fileId) {
      const {
        fileName,
        uploader,
        size
      } = await fetch(link);
      const dlink = `https://spyderrock.com/${fileId}.${fileName.split(".").pop()}`;
      return {
        fileName: fileName,
        uploader: uploader,
        size: size,
        dlink: dlink
      };
    } else {
      throw new Error("ID File nya kagak ada bree 🙂‍↔️");
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Url parameter is required"
    });
  }
  const qiwi = new Qiwi();
  try {
    const result = await qiwi.dl(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}