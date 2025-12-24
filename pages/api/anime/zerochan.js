import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class ZerochanScraper {
  constructor() {
    this.zerochanBaseURL = "https://www.zerochan.net";
    this.htmlGetterAPI = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v8?url=`;
    this.client = axios.create({
      timeout: 6e4
    });
    this.selectors = {
      find: {
        carouselItems: ".carousel ul li",
        carouselLink: "a",
        carouselImageUrl: "div",
        carouselTitle: "p",
        thumbsItems: "#thumbs2 li",
        thumbsLink: "a.thumb",
        thumbsImage: "img",
        thumbsDownloadLink: "a.download"
      },
      detail: {
        jsonLdScript: 'script[type="application/ld+json"]',
        title: "h1",
        downloadButton: "a.download-button",
        dimensionsAlt: "#image-actions + p",
        artistLink: "#creator-uploader .mangaka a",
        uploaderLink: "#creator-uploader .user",
        characterLink: "#creator-uploader .character a",
        mainImageAlt: "#large ul li:first-child img"
      }
    };
  }
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async getHtmlFromApi(targetUrl) {
    try {
      console.log(`[HTML_GETTER] Meminta HTML untuk ${targetUrl} melalui API.`);
      const encodedUrl = encodeURIComponent(targetUrl);
      const apiUrl = `${this.htmlGetterAPI}${encodedUrl}`;
      const response = await this.client.get(apiUrl);
      console.log(`[RESPONSE API] Menerima respons dari: ${apiUrl} dengan status: ${response.status}`);
      if (typeof response.data === "string") {
        return response.data;
      } else {
        throw new Error("Format respons dari HTML getter API tidak dikenal.");
      }
    } catch (error) {
      let errorMessage = `Gagal mendapatkan HTML dari API untuk URL ${targetUrl}`;
      if (error.response) {
        errorMessage += ` dengan status: ${error.response.status} - ${error.response.statusText}`;
        if (error.response.data) {
          const errorData = typeof error.response.data === "string" ? error.response.data : JSON.stringify(error.response.data);
          errorMessage += `. Data: ${errorData.substring(0, 150)}...`;
        }
        if (error.response.status === 503) {
          console.warn("[ERROR 503] Server API terlalu sibuk atau memblokir akses. Coba ulangi setelah beberapa saat.");
        }
      } else if (error.request) {
        errorMessage += ". Tidak ada respons diterima. Mungkin masalah jaringan atau timeout.";
      } else {
        errorMessage += `: ${error.message}`;
      }
      console.error(`[HTML_GETTER ERROR] ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  cleanObject(obj) {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }
    if (Array.isArray(obj)) {
      const cleanedArray = obj.map(item => this.cleanObject(item)).filter(item => {
        if (typeof item === "string" && item.trim() === "") return false;
        if (Array.isArray(item) && item.length === 0) return false;
        if (item === null || item === undefined) return false;
        return true;
      });
      return cleanedArray.length > 0 ? cleanedArray : undefined;
    }
    const cleaned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        let value = obj[key];
        if (typeof value === "object" && value !== null) {
          value = this.cleanObject(value);
        }
        if (value !== undefined && value !== null && value !== "") {
          if (Array.isArray(value) && value.length === 0) {} else if (typeof value === "object" && Object.keys(value).length === 0 && !Array.isArray(value)) {} else {
            cleaned[key] = value;
          }
        }
      }
    }
    return cleaned;
  }
  async find({
    query = "assasin",
    limit = 3
  }) {
    try {
      console.log(`[FIND] Memulai pencarian dengan query: "${query}"`);
      const targetUrl = `${this.zerochanBaseURL}/search?q=${encodeURIComponent(query)}`;
      const htmlContent = await this.getHtmlFromApi(targetUrl);
      const $ = cheerio.load(htmlContent);
      console.log(`[FIND] Halaman hasil pencarian berhasil dimuat dari API.`);
      const carouselItems = $(this.selectors.find.carouselItems).get().map(el => {
        const $el = $(el);
        const link = $el.find(this.selectors.find.carouselLink).attr("href") || "";
        const imageUrl = $el.find(this.selectors.find.carouselImageUrl).attr("data-src") || "";
        const title = $el.find(this.selectors.find.carouselTitle).text()?.trim() || "";
        return link && imageUrl && title ? {
          title: title,
          link: `${this.zerochanBaseURL}${link}`,
          imageUrl: imageUrl
        } : null;
      }).filter(item => item !== null);
      console.log(`[FIND] Ditemukan ${carouselItems.length} item di carousel.`);
      const thumbs = $(this.selectors.find.thumbsItems).get();
      const thumbs2 = [];
      for (const el of thumbs) {
        if (thumbs2.length >= limit) break;
        const $el = $(el);
        const link = $el.find(this.selectors.find.thumbsLink).attr("href") || "";
        const img = $el.find(this.selectors.find.thumbsImage).eq(0);
        const imageUrl = img.attr("src") || "";
        const alt = img.attr("alt") || "";
        const title = img.attr("title") || "";
        const downloadLink = $el.find(this.selectors.find.thumbsDownloadLink).attr("href") || "";
        if (link && imageUrl && alt) {
          thumbs2.push({
            id: link.replace("/", ""),
            title: alt,
            link: `${this.zerochanBaseURL}${link}`,
            imageUrl: imageUrl,
            downloadLink: downloadLink,
            dimensions: title
          });
        }
      }
      console.log(`[FIND] Ditemukan ${thumbs2.length} item thumbnail. Memulai pengambilan detail.`);
      const finalRes = [];
      for (const item of thumbs2) {
        await this.delay(1500 + Math.random() * 1e3);
        const detail = await this.getDetail(item.id);
        if (detail && !detail.error) {
          const cleanedDetail = this.cleanObject(detail);
          if (Object.keys(cleanedDetail).length > 1 || Object.keys(cleanedDetail).length === 1 && cleanedDetail.id) {
            finalRes.push({
              ...this.cleanObject(item),
              detail: cleanedDetail
            });
            console.log(`[FIND] Detail untuk ID ${item.id} berhasil diambil dan dibersihkan.`);
          } else {
            console.warn(`[FIND] Melewatkan detail untuk ID ${item.id} karena hasilnya terlalu kosong setelah dibersihkan.`);
          }
        } else {
          console.warn(`[FIND] Melewatkan detail untuk ID ${item.id} karena gagal diambil atau ada error.`);
        }
      }
      console.log(`[FIND] Pencarian selesai. Total hasil: ${finalRes.length}`);
      return {
        query: query,
        carousel: this.cleanObject(carouselItems),
        results: finalRes,
        total: finalRes.length,
        limit: limit
      };
    } catch (error) {
      console.error(`[FIND ERROR] Pencarian gagal: ${error.message}`);
      throw new Error(`Pencarian gagal: ${error.message}`);
    }
  }
  async getDetail(imageId) {
    try {
      console.log(`[GET_DETAIL] Mengambil detail untuk image ID: ${imageId}`);
      const targetUrl = `${this.zerochanBaseURL}/${imageId}`;
      const htmlContent = await this.getHtmlFromApi(targetUrl);
      const $ = cheerio.load(htmlContent);
      console.log(`[GET_DETAIL] Halaman detail untuk ID ${imageId} berhasil dimuat dari API.`);
      const jsonLd = $(this.selectors.detail.jsonLdScript).html();
      let structData = {};
      if (jsonLd) {
        try {
          structData = JSON.parse(jsonLd);
          console.log(`[GET_DETAIL] Structured data ditemukan untuk ID ${imageId}.`);
        } catch (e) {
          console.warn(`[GET_DETAIL] Gagal mengurai structured data untuk ID ${imageId}: ${e.message}`);
          structData = {};
        }
      }
      const title = structData.name || $(this.selectors.detail.title).text()?.trim() || "";
      const downloadUrl = structData.contentUrl || $(this.selectors.detail.downloadButton).attr("href") || "";
      let dims = "";
      if (structData.width && structData.height && structData.contentSize) {
        dims = `${structData.width}x${structData.height} ${structData.contentSize}`;
      } else {
        const pAfterActions = $(this.selectors.detail.dimensionsAlt);
        if (pAfterActions && pAfterActions.text()?.includes("x") && pAfterActions.text()?.includes("kB")) {
          dims = pAfterActions.text()?.trim() || "";
        }
      }
      const artist = structData.creator?.name || $(this.selectors.detail.artistLink).text()?.trim() || "";
      const artist_link = structData.creator?.url || ($(this.selectors.detail.artistLink).attr("href") ? `${this.zerochanBaseURL}${$(this.selectors.detail.artistLink).attr("href")}` : "");
      const uploader = $(this.selectors.detail.uploaderLink).text()?.trim() || "";
      const uploader_link = $(this.selectors.detail.uploaderLink).attr("href") ? `${this.zerochanBaseURL}${$(this.selectors.detail.uploaderLink).attr("href")}` : "";
      const character = $(this.selectors.detail.characterLink).text()?.trim() || "";
      const character_link = $(this.selectors.detail.characterLink).attr("href") ? `${this.zerochanBaseURL}${$(this.selectors.detail.characterLink).attr("href")}` : "";
      const tags = [];
      if (structData.keywords && Array.isArray(structData.keywords)) {
        tags.push(...structData.keywords);
      } else {
        const mainImageAlt = $(this.selectors.detail.mainImageAlt).attr("alt") || "";
        if (mainImageAlt.includes("Tags:")) {
          const tagStr = mainImageAlt.split("Tags:")[1];
          if (tagStr) {
            const extractedTags = tagStr.split(",").map(tag => tag?.trim()).filter(tag => tag);
            tags.push(...extractedTags);
          }
        }
      }
      console.log(`[GET_DETAIL] Detail berhasil diekstrak untuk ID ${imageId}.`);
      const rawDetail = {
        id: imageId,
        title: title,
        downloadUrl: downloadUrl,
        dims: dims,
        artist: artist,
        artist_link: artist_link,
        uploader: uploader,
        uploader_link: uploader_link,
        character: character,
        character_link: character_link,
        tags: tags,
        structData: structData,
        fullUrl: `${this.zerochanBaseURL}/${imageId}`
      };
      return this.cleanObject(rawDetail);
    } catch (error) {
      console.error(`[GET_DETAIL ERROR] Gagal mengambil detail untuk ID ${imageId}: ${error.message}`);
      return {
        id: imageId,
        error: error?.message || "Unknown error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "query are required"
    });
  }
  try {
    const scraper = new ZerochanScraper();
    const response = await scraper.find(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}