import axios from "axios";
class TeraboxAPI {
  async download(videoUrl) {
    try {
      const response = await axios.post("https://testterabox.vercel.app/api", {
        url: videoUrl
      }, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
          Referer: "https://teraboxdownloader.online/"
        }
      });
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = response.data;
      return {
        medias: [{
          text: json.file_name,
          url: json.direct_link,
          quality: json.size
        }]
      };
    } catch (error) {
      console.error("Error in TeraboxAPI down:", error);
      throw new Error(`Gagal mengunduh video: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      message: "No url provided"
    });
  }
  const terabox = new TeraboxAPI();
  try {
    const result = await terabox.download(url);
    return res.status(200).json(typeof result === "object" ? result : result);
  } catch (error) {
    console.error("Error during download:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}