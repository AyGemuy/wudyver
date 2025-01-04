import axios from "axios";
import qs from "qs";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed. Use GET."
    });
  }
  const {
    username
  } = req.method === "GET" ? req.query : req.body;
  if (!username) {
    return res.status(400).json({
      error: "Username query parameter is required."
    });
  }
  try {
    const data = qs.stringify({
      instagram_url: username,
      type: "instaviewer",
      resource: "save"
    });
    const config = {
      method: "POST",
      url: "https://www.save-free.com/process",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 8.1.0; CPH1803; Build/OPM1.171019.026) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.4280.141 Mobile Safari/537.36 KiToBrowser/124.0",
        Accept: "text/html, */*; q=0.01",
        "accept-language": "id-ID",
        referer: "https://www.save-free.com/instagram-viewer/",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-valy-cache": "true",
        "x-requested-with": "XMLHttpRequest",
        origin: "https://www.save-free.com"
      },
      data: data
    };
    const response = await axios.request(config);
    return res.status(200).json({
      result: response.data
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch data",
      details: error.message
    });
  }
}