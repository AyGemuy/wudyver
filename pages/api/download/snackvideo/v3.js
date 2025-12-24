import axios from "axios";
class Downloader {
  async download({
    url,
    ...rest
  }) {
    console.log("Memulai proses unduhan via Teknogram API...");
    try {
      const apiUrl = "https://api.teknogram.id/v1/snackvideo";
      const headers = {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json; charset=UTF-8",
        origin: "https://teknogram.id",
        referer: "https://teknogram.id/tools/snack-video-downloader/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      const data = {
        url: url
      };
      console.log(`Mengirim permintaan ke: ${apiUrl}`);
      const response = await axios.post(apiUrl, data, {
        headers: headers,
        ...rest
      });
      console.log("Menerima dan memproses respons API...");
      const originalLink = response.data?.url || null;
      const finalLink = originalLink ? originalLink.replace("get.teknogram.id", "ddl.teknogram.id") : null;
      if (response.data?.status !== true || !finalLink) {
        throw new Error("API tidak mengembalikan tautan unduhan yang valid.");
      }
      const result = {
        result: finalLink
      };
      console.log("Proses unduhan Teknogram selesai.");
      return result;
    } catch (error) {
      console.error("Terjadi kesalahan selama proses unduhan Teknogram:", error.message);
      const errorMessage = error.response?.data?.message || error.message || "Kesalahan tidak diketahui";
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