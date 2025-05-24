import axios from "axios";
import qs from "qs";
class VideoDownloader {
  async youtube({
    url: videoUrl
  }) {
    console.log(`Starting download process for video URL: ${videoUrl}`);
    try {
      const searchData = qs.stringify({
        query: videoUrl,
        vt: "home"
      });
      console.log("Sending search request...");
      const searchResponse = await axios.post("https://ssvid.net/api/ajax/search", searchData, {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          accept: "*/*",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      console.log("Search response received:", searchResponse.data);
      if (searchResponse.data.status !== "ok") {
        throw new Error("Failed to fetch video details");
      }
      const {
        vid,
        links
      } = searchResponse.data;
      const mp4Key = links.mp4?.["18"]?.k || links.mp4?.auto?.k;
      const mp3Key = links.mp3?.mp3128?.k;
      if (!mp4Key && !mp3Key) {
        throw new Error("No download links found");
      }
      const result = {};
      if (mp4Key) {
        console.log("Fetching MP4 download link...");
        const mp4Data = qs.stringify({
          vid: vid,
          k: mp4Key
        });
        const mp4Response = await axios.post("https://ssvid.net/api/ajax/convert", mp4Data, {
          headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            accept: "*/*",
            "x-requested-with": "XMLHttpRequest"
          }
        });
        console.log("MP4 response received:", mp4Response.data);
        result.mp4 = mp4Response.data;
      }
      if (mp3Key) {
        console.log("Fetching MP3 download link...");
        const mp3Data = qs.stringify({
          vid: vid,
          k: mp3Key
        });
        const mp3Response = await axios.post("https://ssvid.net/api/ajax/convert", mp3Data, {
          headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            accept: "*/*",
            "x-requested-with": "XMLHttpRequest"
          }
        });
        console.log("MP3 response received:", mp3Response.data);
        result.mp3 = mp3Response.data;
      }
      console.log("Download links fetched successfully:", result);
      return result;
    } catch (error) {
      console.error("Error fetching download links:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const downloader = new VideoDownloader();
  try {
    const data = await downloader.youtube(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}