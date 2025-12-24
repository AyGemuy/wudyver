import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import {
  URLSearchParams
} from "url";
class Crotpedia {
  constructor(baseURL = "https://crotpedia.net", guestEmail = "crotpedia-guest@gmail.com", guestPassword = "crotpedia-guest") {
    this.BASE_URL = baseURL;
    this.GUEST_EMAIL = guestEmail;
    this.GUEST_PASSWORD = guestPassword;
    this.globalAxiosConfig = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36"
      }
    };
    this.plainAxiosClient = axios.create(this.globalAxiosConfig);
    this._axiosClientWithCookies = null;
  }
  _getAxiosClientWithCookies() {
    if (!this._axiosClientWithCookies) {
      const jar = new CookieJar();
      this._axiosClientWithCookies = wrapper(axios.create({
        ...this.globalAxiosConfig,
        jar: jar
      }));
    }
    return this._axiosClientWithCookies;
  }
  async search(query = "") {
    if (!query || typeof query !== "string" || query.trim() === "") {
      return {
        success: false,
        query: query,
        error: "Kata kunci pencarian tidak valid atau kosong.",
        results: []
      };
    }
    const searchUrl = `${this.BASE_URL}/?s=${encodeURIComponent(query.trim())}`;
    try {
      const {
        data: htmlContent
      } = await this.plainAxiosClient.get(searchUrl);
      const $ = cheerio.load(htmlContent);
      const results = [];
      $(".flexbox2-item").each((_, el) => {
        const element = $(el);
        const title = element.find(".flexbox2-title span").first().text().trim();
        const link = element.find("a").attr("href");
        const image = element.find("img").attr("src");
        const studio = element.find(".flexbox2-title .studio").text().trim();
        const scoreText = element.find(".score").text().replace("★", "").trim();
        const score = parseFloat(scoreText) || null;
        const chapterInfo = element.find(".season").text().trim();
        const genres = [];
        element.find(".genres a").each((_, genreEl) => {
          genres.push($(genreEl).text().trim());
        });
        if (title && link) {
          results.push({
            title: title,
            seriesUrl: link,
            thumbnailUrl: image || null,
            studio: studio || null,
            score: score,
            latestChapterInfo: chapterInfo || null,
            genres: genres
          });
        }
      });
      return {
        success: true,
        query: query,
        results: results
      };
    } catch (error) {
      console.error(`[Crotpedia.search] Error: ${error.message} untuk URL: ${searchUrl}`);
      return {
        success: false,
        query: query,
        error: error.message,
        results: []
      };
    }
  }
  async detail(seriesUrl = "") {
    if (!seriesUrl || typeof seriesUrl !== "string" || !seriesUrl.startsWith(this.BASE_URL)) {
      return {
        success: false,
        error: "URL series tidak valid.",
        url: seriesUrl
      };
    }
    try {
      const {
        data: htmlContent
      } = await this.plainAxiosClient.get(seriesUrl);
      const $ = cheerio.load(htmlContent);
      const seriesFlexLeft = $(".series-flexleft");
      if (seriesFlexLeft.length === 0) {
        return {
          success: false,
          error: "Struktur halaman series tidak dikenali (.series-flexleft tidak ditemukan).",
          url: seriesUrl
        };
      }
      const title = seriesFlexLeft.find(".series-titlex h2").text().trim();
      const originalTitle = seriesFlexLeft.find(".series-titlex span").text().trim() || null;
      let coverImageUrl = $(".series-cover .series-bg").css("background-image");
      if (coverImageUrl) {
        coverImageUrl = coverImageUrl.replace(/^url\(["']?/, "").replace(/["']?\)$/, "");
      } else {
        coverImageUrl = seriesFlexLeft.find(".series-thumb img").attr("src") || null;
      }
      const type = seriesFlexLeft.find(".series-infoz.block .type").text().trim() || null;
      const status = seriesFlexLeft.find(".series-infoz.block .status").text().trim() || null;
      const scoreText = seriesFlexLeft.find(".series-infoz.score span").text().trim();
      const score = parseFloat(scoreText) || null;
      const seriesInfoListItems = {};
      seriesFlexLeft.find("ul.series-infolist li").each((index, element) => {
        const labelElement = $(element).find("b");
        const label = labelElement.text().trim().replace(":", "").toLowerCase().replace(/\s+/g, "_");
        let valueNode = labelElement.siblings("span");
        let value = valueNode.text().trim();
        if (!value && valueNode.find("a").length) {
          value = {
            text: valueNode.find("a").text().trim(),
            link: valueNode.find("a").attr("href")
          };
        } else if (!value && labelElement[0] && labelElement[0].nextSibling) {
          value = labelElement[0].nextSibling.nodeValue ? labelElement[0].nextSibling.nodeValue.trim() : null;
        }
        if (label && value !== undefined && value !== null && String(value).trim() !== "") {
          seriesInfoListItems[label] = value;
        }
      });
      const chapters = [];
      $(".series-chapterlist li").each((index, element) => {
        const chapterLi = $(element);
        const infoLinkElement = chapterLi.find(".flexch-infoz a");
        const chapterTitle = infoLinkElement.find("span").first().text().trim();
        const chapterUrl = infoLinkElement.attr("href");
        const chapterDate = infoLinkElement.find("span.date").text().trim() || null;
        if (chapterTitle && chapterUrl) {
          chapters.push({
            title: chapterTitle,
            url: chapterUrl,
            date: chapterDate
          });
        }
      });
      return {
        success: true,
        url: seriesUrl,
        title: title,
        originalTitle: originalTitle,
        coverImageUrl: coverImageUrl,
        type: type,
        status: status,
        score: score,
        details: seriesInfoListItems,
        chapters: chapters
      };
    } catch (error) {
      console.error(`[Crotpedia.detail] Error: ${error.message} untuk URL: ${seriesUrl}`);
      return {
        success: false,
        url: seriesUrl,
        error: error.message
      };
    }
  }
  async download(chapterUrl = "") {
    if (!chapterUrl || typeof chapterUrl !== "string" || !chapterUrl.startsWith(this.BASE_URL)) {
      return {
        success: false,
        error: "URL chapter tidak valid.",
        url: chapterUrl
      };
    }
    const client = this._getAxiosClientWithCookies();
    let finalHtml;
    try {
      const initialResponse = await client.get(chapterUrl);
      let $ = cheerio.load(initialResponse.data);
      const loginForm = $("form#koi_login_form");
      if (loginForm.length > 0) {
        const nonce = loginForm.find('input[name="koi_login_nonce"]').val();
        if (!nonce) return {
          success: false,
          error: "Nonce login tidak ditemukan.",
          url: chapterUrl
        };
        const loginData = new URLSearchParams();
        loginData.append("koi_user_login", this.GUEST_EMAIL);
        loginData.append("koi_user_pass", this.GUEST_PASSWORD);
        loginData.append("koi_login_nonce", nonce);
        const loginPostResponse = await client.post(chapterUrl, loginData.toString(), {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: chapterUrl
          }
        });
        const $afterPost = cheerio.load(loginPostResponse.data);
        if ($afterPost("form#koi_login_form").length > 0) {
          return {
            success: false,
            error: "Login gagal, form login masih ada setelah POST.",
            url: chapterUrl
          };
        }
        const finalGetResponse = await client.get(chapterUrl);
        finalHtml = finalGetResponse.data;
        const $finalPageCheck = cheerio.load(finalHtml);
        if ($finalPageCheck("form#koi_login_form").length > 0) {
          return {
            success: false,
            error: "Login gagal, form login masih ada setelah GET final.",
            url: chapterUrl
          };
        }
      } else {
        finalHtml = initialResponse.data;
      }
      const $page = cheerio.load(finalHtml);
      const pageTitle = $page("title").text().trim();
      const navigationData = {};
      const images = [];
      const chapNavElement = $page("#chapnav .content");
      if (chapNavElement.length > 0) {
        navigationData.seriesTitle = chapNavElement.find(".infox .title a").text().trim() || null;
        navigationData.seriesUrl = chapNavElement.find(".infox .title a").attr("href") || null;
        navigationData.currentChapterName = chapNavElement.find(".infox .chapter").text().trim() || null;
        let chapterDateRaw = chapNavElement.find(".infox .date").text().trim();
        navigationData.chapterDate = chapterDateRaw.startsWith("•") ? chapterDateRaw.substring(1).trim() : chapterDateRaw || null;
        navigationData.seriesThumbnailUrl = chapNavElement.find(".thumb img").attr("src") || null;
        const prevLink = chapNavElement.find(".navigation .leftnav a");
        navigationData.previousChapterUrl = prevLink.length ? prevLink.attr("href") : null;
        const nextLink = chapNavElement.find(".navigation .rightnav a");
        navigationData.nextChapterUrl = nextLink.length ? nextLink.attr("href") : null;
      }
      $page(".reader-area p img").each((index, element) => {
        const imageUrl = $(element).attr("src");
        if (imageUrl) images.push(imageUrl);
      });
      return {
        success: true,
        url: chapterUrl,
        pageTitle: pageTitle,
        navigation: Object.keys(navigationData).length > 0 ? navigationData : null,
        images: images
      };
    } catch (error) {
      console.error(`[Crotpedia.download] Error: ${error.message} untuk URL: ${chapterUrl}`);
      return {
        success: false,
        url: chapterUrl,
        error: error.message
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
  if (!action) return res.status(400).json({
    error: "Action is required"
  });
  try {
    const crotpediaInstance = new Crotpedia();
    let result;
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: "Query is required for search"
        });
        result = await crotpediaInstance.search(query);
        break;
      case "detail":
        if (!url) return res.status(400).json({
          error: "URL is required for detail"
        });
        result = await crotpediaInstance.detail(url);
        break;
      case "download":
        if (!url) return res.status(400).json({
          error: "URL is required for detail"
        });
        result = await crotpediaInstance.download(url);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}