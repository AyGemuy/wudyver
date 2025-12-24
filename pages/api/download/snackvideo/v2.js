import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  async download({
    url,
    ...rest
  }) {
    console.log("Memulai proses unduhan...");
    try {
      const apiUrl = "https://getsnackvideo.com/results";
      const headers = {
        accept: "text/html-partial, */*; q=0.9",
        "accept-language": "id-ID",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://getsnackvideo.com",
        referer: "https://getsnackvideo.com/id",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      const data = new URLSearchParams({
        "ic-request": "true",
        id: url,
        locale: "id"
      }).toString();
      console.log(`Mengambil data dari: ${apiUrl}`);
      const response = await axios.post(apiUrl, data, {
        headers: headers,
        ...rest
      });
      console.log("Menganalisis respons HTML...");
      const $ = cheerio.load(response.data);
      const thumbnail = $(".img_thumb img")?.attr("src") || null;
      const description = $(".infotext")?.first()?.text()?.trim() || "Deskripsi tidak ditemukan";
      const downloadLinks = $(".table-result tbody tr").map((index, element) => {
        const row = $(element);
        const quality = row.find("td:first-child .download_links")?.text()?.trim();
        const link = row.find("td:last-child a.download_link")?.attr("href");
        if (quality && link) {
          return {
            quality: quality,
            link: link
          };
        }
      }).get();
      const result = {
        thumbnail: thumbnail,
        description: description,
        result: downloadLinks || []
      };
      console.log("Proses unduhan selesai.");
      return result;
    } catch (error) {
      console.error("Terjadi kesalahan selama proses unduhan:", error.message);
      const errorMessage = error.response ? error.response.data : "Kesalahan tidak diketahui";
      throw new Error(errorMessage);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const client = new Downloader();
    const response = await client.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}