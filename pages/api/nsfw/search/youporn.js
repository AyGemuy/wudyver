import apiConfig from "@/configs/apiConfig";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
export default async function handler(req, res) {
  const {
    q,
    id,
    action
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' diperlukan."
    });
  }
  if (action === "search") {
    if (!q) {
      return res.status(400).json({
        error: "Paramenter 'q' diperlukan untuk pencarian."
      });
    }
    try {
      const linkb = `https://www.youporn.com?query=${encodeURIComponent(q)}`;
      const response = await fetch(`${randomProxyUrl}${encodeURIComponent(linkb)}`);
      const body = await response.text();
      const $ = cheerio.load(body);
      const results = $(".video-box.pc.js_video-box").map((_, el) => {
        const $el = $(el);
        return {
          videoId: $el.attr("data-video-id"),
          videoUrl: $el.find(".tm_video_link").attr("href"),
          imgSrc: $el.find(".thumb-image-container img").data("src"),
          poster: $el.find(".thumb-image-container img").attr("data-poster"),
          mediaBook: $el.find(".thumb-image-container img").attr("data-mediabook"),
          title: $el.find(".video-title.tm_video_title").text().trim(),
          resolution: $el.find(".video-best-resolution").text().trim(),
          duration: $el.find(".video-duration.tm_video_duration").text().trim(),
          rating: $el.find(".info-rate").text().trim(),
          views: $el.find(".info-views").text().trim()
        };
      }).get();
      return res.status(200).json({
        results: results
      });
    } catch (error) {
      console.error("Error fetching video data:", error);
      return res.status(500).json({
        error: "Terjadi kesalahan saat pencarian video."
      });
    }
  }
  if (action === "download") {
    if (!id) {
      return res.status(400).json({
        error: "Paramenter 'id' diperlukan untuk download."
      });
    }
    try {
      const response = await fetch(`https://www.youporn.com/watch/${id}`);
      const text = await response.text();
      const jsonDataMatch = text.split("page_params.video_player_setup")[1]?.split("page_params.video.playerParams")[0]?.match(/(\{(?:[^{}"\\]|\\.)*\}|(?:\[.*?\]))/g);
      if (jsonDataMatch) {
        const jsonData = JSON.parse(jsonDataMatch[1] || jsonDataMatch[0]);
        const data = jsonData[1]?.videoUrl || jsonData[0]?.videoUrl;
        const responseD = await fetch(`${randomProxyUrl}${encodeURIComponent(data)}`);
        const outs = await responseD.json();
        return res.status(200).json({
          videoUrl: outs[3] || outs[2] || outs[1] || outs[0]
        });
      } else {
        console.error("No JSON data found");
        return res.status(500).json({
          error: "Gagal menemukan data JSON video."
        });
      }
    } catch (error) {
      console.error("Error fetching video data:", error);
      return res.status(500).json({
        error: "Terjadi kesalahan saat mengunduh video."
      });
    }
  }
  return res.status(400).json({
    error: "Action tidak valid."
  });
}