import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  async download({
    url,
    ...rest
  }) {
    console.log("Proses: Memulai unduhan...");
    try {
      console.log(`Proses: Mengirim permintaan ke ${url}`);
      const response = await axios.post("https://dvsnackvideo.com/abc_download", {
        url: url || "https://www.snackvideo.com/@kwai/video/5199274407939319471?pwa_source=web_share",
        locale: rest.locale || "en",
        type: rest.type || "video"
      }, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "content-type": "text/plain;charset=UTF-8",
          origin: "https://dvsnackvideo.com",
          priority: "u=1, i",
          referer: "https://dvsnackvideo.com/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log("Proses: Berhasil menerima respons. Memulai parsing HTML...");
      const $ = cheerio.load(response.data);
      const resultContainer = $("#results .result");
      if (resultContainer.length === 0) {
        console.log("Proses: Kontainer hasil tidak ditemukan. Parsing dihentikan.");
        return null;
      }
      const result = {
        video: null,
        video_wm: null,
        mp3: null,
        thumbnail: null
      };
      console.log("Proses: Memproses link download...");
      resultContainer.find(".download-container a").each((i, elem) => {
        const buttonText = $(elem).text().trim().toLowerCase();
        let downloadUrl = $(elem).attr("href");
        if (!downloadUrl) {
          console.log(`Peringatan: URL download tidak ditemukan untuk tombol "${buttonText}"`);
          return;
        }
        if (downloadUrl.startsWith("//")) {
          downloadUrl = "https:" + downloadUrl;
        } else if (downloadUrl.startsWith("/")) {
          downloadUrl = "https://dvsnackvideo.com" + downloadUrl;
        } else if (!downloadUrl.startsWith("https://")) {
          downloadUrl = "https://dvsnackvideo.com/" + downloadUrl;
        }
        const mapping = {
          "without watermark": "video_wm",
          "no watermark": "video_wm",
          "with watermark": "video",
          original: "video",
          mp3: "mp3",
          music: "mp3",
          thumbnail: "thumbnail",
          cover: "thumbnail"
        };
        let matched = false;
        for (const [keyword, key] of Object.entries(mapping)) {
          if (buttonText.includes(keyword)) {
            result[key] = downloadUrl;
            console.log(`✓ ${key}: ${downloadUrl}`);
            matched = true;
            break;
          }
        }
        if (!matched) {
          console.log(`● Link tambahan (${buttonText}): ${downloadUrl}`);
        }
      });
      if (!result.video && result.video_wm) {
        console.log("Proses: Menggunakan video tanpa watermark sebagai fallback untuk video");
        result.video = result.video_wm;
      }
      const data = {
        title: resultContainer.find(".video-title").text()?.trim() || "Judul tidak tersedia",
        thumbnail: resultContainer.find("img.thumbnail").attr("src") || result.thumbnail || "Thumbnail tidak tersedia",
        likes: resultContainer.find(".likes span").text()?.trim() || "0",
        views: resultContainer.find(".views span").text()?.trim() || "0",
        comments: resultContainer.find(".comments span").text()?.trim() || "0",
        duration: resultContainer.find(".duration span").text()?.trim() || "00:00",
        result: result
      };
      console.log("Proses: Parsing selesai.");
      return data;
    } catch (error) {
      console.error("Terjadi kesalahan selama proses unduhan:", error.message);
      console.error("Detail error:", error.response?.data);
      return null;
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