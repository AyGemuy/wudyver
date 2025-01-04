import axios from "axios";
import * as cheerio from "cheerio";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Only GET method is allowed"
    });
  }
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL parameter is required"
    });
  }
  try {
    const response = await axios.post("https://snapinsta.tv/core/ajax.php", new URLSearchParams({
      url: url,
      host: "instagram"
    }), {
      headers: {
        accept: "*/*",
        cookie: "PHPSESSID=a457b241510ae4498043da9e765de30c; _gid=GA1.2.1007159517.1698108684; _gat_gtag_UA_209171683_55=1; _no_tracky_101422226=1; _ga_N43B1RQRDX=GS1.1.1698108684.1.1.1698108695.0.0.0; _ga=GA1.1.1466088105.1698108684",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
      }
    });
    const $ = cheerio.load(response.data);
    const media = $("div.row > div.col-md-12 > div.row.story-container.mt-4.pb-4.border-bottom").map((_, el) => {
      const link = "https://snapinsta.tv/" + $(el).find("div.col-md-8.mx-auto > a").attr("href");
      const imgSrc = $(el).find("div.col-md-8.mx-auto > div.image > img").attr("src");
      return {
        link: link,
        imgSrc: imgSrc
      };
    }).get();
    if (media.length === 0) {
      return res.status(404).json({
        error: "No media found for the provided URL"
      });
    }
    return res.status(200).json({
      status: 200,
      url: media[0].link,
      image: media[0].imgSrc
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      error: "Failed to process the request. Please try again."
    });
  }
}