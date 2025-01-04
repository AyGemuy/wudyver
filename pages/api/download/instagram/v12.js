import axios from "axios";
import qs from "qs";
import * as cheerio from "cheerio";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed, use GET."
    });
  }
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL tidak boleh kosong."
    });
  }
  const data = qs.stringify({
    url: url,
    v: "3",
    lang: "en"
  });
  const config = {
    method: "POST",
    url: "https://api.downloadgram.org/media",
    headers: {
      "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
      "Content-Type": "application/x-www-form-urlencoded",
      "accept-language": "id-ID",
      referer: "https://downloadgram.org/",
      origin: "https://downloadgram.org",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      priority: "u=0",
      te: "trailers"
    },
    data: data
  };
  try {
    const response = await axios.request(config);
    const $ = cheerio.load(response.data);
    let mediaInfo = {};
    if ($("video").length) {
      mediaInfo.videoUrl = $("video source").attr("src");
      mediaInfo.downloadUrl = $("a[download]").attr("href");
      mediaInfo.posterUrl = $("video").attr("poster");
    } else if ($("img").length) {
      mediaInfo.imageUrl = $("img").attr("src");
      mediaInfo.downloadUrl = $("a[download]").attr("href");
    }
    for (let key in mediaInfo) {
      if (mediaInfo.hasOwnProperty(key)) {
        mediaInfo[key] = mediaInfo[key].replace(/\\\\"/g, "").replace(/\\"/g, "");
      }
    }
    return res.status(200).json({
      mediaInfo: mediaInfo
    });
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}