import axios from "axios";
import * as cheerio from "cheerio";
const proxyUrls = ["https://thingproxy.freeboard.io/fetch/", "https://cors.newfrontdoor.org/api/cors?url=", "https://api.allorigins.win/raw?url="];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
class EpornerAPI {
  async search(q = "indonesia") {
    try {
      const response = await axios.get(randomProxyUrl + `https://www.eporner.com/search?q=${q}`),
        $ = cheerio.load(response.data);
      return $("#vidresults .mb").map((index, el) => ({
        id: $(el).data("id") || "ID not available",
        quality: $(el).find(".mvhdico span").text() || "Quality not available",
        title: $(el).find(".mbtit a").text() || "Title not available",
        duration: $(el).find(".mbtim").text() || "Duration not available",
        rating: $(el).find(".mbrate").text() || "Rating not available",
        views: $(el).find(".mbvie").text() || "Views not available",
        uploader: $(el).find(".mb-uploader a").text() || "Uploader not available",
        link: new URL($(el).find(".mbtit a").attr("href"), "https://www.eporner.com").href || "Link not available",
        thumbnail: $(el).find(".mbimg img").attr("src") || "Thumbnail not available"
      })).get();
    } catch (error) {
      return console.error("Error fetching data:", error), null;
    }
  }
  async detail(url) {
    try {
      const response = await axios.get(randomProxyUrl + url),
        $ = cheerio.load(response.data),
        title = $('meta[property="og:title"]').attr("content") || "Meta Title Not Found",
        description = $('meta[property="og:description"]').attr("content") || "Meta Description Not Found",
        thumbnail = $('meta[property="og:image"]').attr("content") || "Thumbnail Not Found";
      return {
        title: title,
        description: description,
        thumbnail: thumbnail,
        download: $(".dloaddivcol .download-h264 a").map((idx, downloadEl) => {
          const qualityMatch = $(downloadEl).text().match(/\d+p/),
            fileSizeMatch = $(downloadEl).text().match(/\d+\.\d+\s*MB/),
            downloadURL = new URL($(downloadEl).attr("href"), url);
          return {
            quality: qualityMatch ? qualityMatch[0] : "Quality Not Found",
            url: downloadURL.href,
            info: $(downloadEl).text().trim(),
            size: fileSizeMatch ? fileSizeMatch[0] : "Size Not Found"
          };
        }).get()
      };
    } catch (error) {
      return console.error("Error fetching data:", error), null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const api = new EpornerAPI();
  if (action === "search" && query) {
    const result = await api.search(query);
    return res.status(200).json({
      result: result
    });
  } else if (action === "detail" && url) {
    const result = await api.detail(url);
    return res.status(200).json({
      result: result
    });
  } else {
    if (!action) {
      return res.status(400).json({
        message: 'Parameter "action" tidak ditemukan. Harap masukkan "search" atau "detail".'
      });
    } else if (action === "search" && !query) {
      return res.status(400).json({
        message: 'Parameter "query" diperlukan untuk pencarian. Harap masukkan kata kunci pencarian.'
      });
    } else if (action === "detail" && !url) {
      return res.status(400).json({
        message: 'Parameter "url" diperlukan untuk detail. Harap masukkan URL yang valid.'
      });
    } else {
      return res.status(400).json({
        message: "Aksi yang tidak valid atau parameter yang hilang."
      });
    }
  }
}