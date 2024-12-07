import axios from "axios";
import * as cheerio from "cheerio";
class Eporner {
  async download(url) {
    try {
      const response = await axios.get(url),
        $ = cheerio.load(response.data),
        title =
          $('meta[property="og:title"]').attr("content") ||
          "Meta Title Not Found",
        description =
          $('meta[property="og:description"]').attr("content") ||
          "Meta Description Not Found",
        thumbnail =
          $('meta[property="og:image"]').attr("content") ||
          "Thumbnail Not Found";
      return {
        title: title,
        description: description,
        thumbnail: thumbnail,
        download: $(".dloaddivcol .download-h264 a")
          .map((idx, downloadEl) => {
            const qualityMatch = $(downloadEl).text().match(/\d+p/),
              fileSizeMatch = $(downloadEl)
                .text()
                .match(/\d+\.\d+\s*MB/),
              downloadURL = new URL($(downloadEl).attr("href"), url);
            return {
              quality: qualityMatch ? qualityMatch[0] : "Quality Not Found",
              url: downloadURL.href,
              info: $(downloadEl).text().trim(),
              size: fileSizeMatch ? fileSizeMatch[0] : "Size Not Found",
            };
          })
          .get(),
      };
    } catch (error) {
      return console.error("Error fetching data:", error), null;
    }
  }
}
const eporner = new Eporner();

const eporners = async (url) => {
  try {
    return await eporner.download(url);
  } catch (error) {
    console.error("Error during download:", error);
    throw error;
  }
};

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) return res.status(400).json({ message: "No url provided" });

  const result = await eporners(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}
