import axios from "axios";
import * as cheerio from "cheerio";
const proxyUrls = ["https://thingproxy.freeboard.io/fetch/", "https://cors.newfrontdoor.org/api/cors?url=", "https://api.allorigins.win/raw?url="];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
class XnxxAPI {
  constructor() {
    this.baseUrl = "https://www.xnxx.com";
    this.axiosInstance = axios.create();
  }
  async search(query = "indonesia") {
    try {
      const randomPage = Math.floor(3 * Math.random()) + 1;
      const searchUrl = randomProxyUrl + `${this.baseUrl}/search/${encodeURIComponent(query)}/${randomPage}`;
      const response = await this.axiosInstance.get(searchUrl);
      const $ = cheerio.load(response.data);
      const results = [];
      const links = [];
      const infos = [];
      const titles = [];
      $("div.mozaique").each((i, element) => {
        $(element).find("div.thumb").each((i, elem) => {
          links.push(this.baseUrl + $(elem).find("a").attr("href").replace("/THUMBNUM/", "/"));
        });
      });
      $("div.mozaique").each((i, element) => {
        $(element).find("div.thumb-under").each((i, elem) => {
          infos.push($(elem).find("p.metadata").text());
          $(elem).find("a").each((i, linkElem) => {
            titles.push($(linkElem).attr("title"));
          });
        });
      });
      for (let i = 0; i < titles.length; i++) {
        results.push({
          title: titles[i],
          info: infos[i],
          link: links[i]
        });
      }
      if (results.length === 0) {
        return {
          status: false,
          result: "No results found."
        };
      }
      return {
        status: true,
        result: results
      };
    } catch (error) {
      console.error("Error fetching search results:", error);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async download(url) {
    try {
      const response = await this.axiosInstance.get(randomProxyUrl + url);
      const $ = cheerio.load(response.data);
      const title = $('meta[property="og:title"]').attr("content");
      const duration = $('meta[property="og:duration"]').attr("content");
      const image = $('meta[property="og:image"]').attr("content");
      const videoType = $('meta[property="og:video:type"]').attr("content");
      const videoWidth = $('meta[property="og:video:width"]').attr("content");
      const videoHeight = $('meta[property="og:video:height"]').attr("content");
      const info = $("span.metadata").text().trim();
      const scriptContent = $("#video-player-bg > script:nth-child(6)").html();
      const files = {
        low: (scriptContent.match("html5player.setVideoUrlLow\\('(.*?)'\\);") || [])[1],
        high: (scriptContent.match("html5player.setVideoUrlHigh\\('(.*?)'\\);") || [])[1],
        HLS: (scriptContent.match("html5player.setVideoHLS\\('(.*?)'\\);") || [])[1],
        thumb: (scriptContent.match("html5player.setThumbUrl\\('(.*?)'\\);") || [])[1],
        thumb69: (scriptContent.match("html5player.setThumbUrl169\\('(.*?)'\\);") || [])[1],
        thumbSlide: (scriptContent.match("html5player.setThumbSlide\\('(.*?)'\\);") || [])[1],
        thumbSlideBig: (scriptContent.match("html5player.setThumbSlideBig\\('(.*?)'\\);") || [])[1]
      };
      return {
        status: true,
        title: title,
        URL: url,
        duration: duration,
        image: image,
        videoType: videoType,
        videoWidth: videoWidth,
        videoHeight: videoHeight,
        info: info,
        files: files
      };
    } catch (error) {
      console.error("Error downloading video:", error);
      return {
        status: false,
        result: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const api = new XnxxAPI();
  if (action === "search" && query) {
    const result = await api.search(query);
    return res.status(200).json({
      result: result
    });
  } else if (action === "detail" && url) {
    const result = await api.download(url);
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