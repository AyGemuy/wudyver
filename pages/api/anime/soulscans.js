import axios from "axios";
import * as cheerio from "cheerio";
class SoulscansScraper {
  constructor() {
    this.base = "https://soulscans.my.id";
    this.headers = {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "id-ID",
      "cache-control": "no-cache"
    };
  }
  async search({
    query,
    ...rest
  }) {
    console.log(`[SEARCH] Memproses query: ${query}`);
    try {
      const url = `${this.base}/?s=${encodeURIComponent(query)}`;
      const {
        data
      } = await axios.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const results = [];
      $(".listupd .bs").each((i, el) => {
        const $el = $(el);
        const $link = $el.find(".bsx a");
        const $img = $el.find("img");
        const $title = $el.find(".bigor .tt");
        const $chapter = $el.find(".epxs");
        const $rating = $el.find(".numscore");
        const $ratingBar = $el.find(".rtb span");
        const $typeEl = $el.find(".type");
        const $status = $el.find(".status");
        const $hot = $el.find(".hotx");
        const postId = $img?.attr("post-id") || "";
        const ratingWidth = $ratingBar?.attr("style") || "";
        const ratingPercent = ratingWidth.match(/width:(\d+)%/)?.[1] || "0";
        let type = "";
        if ($typeEl.length > 0) {
          const classAttr = $typeEl.attr("class") || "";
          const match = classAttr.match(/type\s+(\w+)/);
          type = match ? match[1] : "";
        }
        results.push({
          title: $title?.text()?.trim() || "",
          url: $link?.attr("href") || "",
          thumbnail: $img?.attr("src") || $img?.attr("data-src") || "",
          latestChapter: $chapter?.text()?.trim() || "",
          rating: parseFloat($rating?.text()?.trim()) || 0,
          ratingPercent: parseInt(ratingPercent) || 0,
          type: type || "",
          status: $status?.text()?.trim() || "Ongoing",
          isHot: $hot?.length > 0 || false,
          postId: postId || ""
        });
      });
      console.log(`[SEARCH] Ditemukan ${results.length} hasil`);
      return {
        ok: true,
        data: results,
        total: results.length
      };
    } catch (e) {
      console.error(`[SEARCH] Error: ${e?.message || e}`);
      return {
        ok: false,
        error: e?.message || "Terjadi kesalahan"
      };
    }
  }
  async detail({
    url,
    ...rest
  }) {
    console.log(`[DETAIL] Memproses URL: ${url}`);
    try {
      const {
        data
      } = await axios.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const title = $('.entry-title[itemprop="name"]')?.text()?.trim() || "";
      const altTitle = $(".alternative")?.text()?.trim() || "";
      const thumbnail = $(".thumb img")?.attr("src") || "";
      const rating = $('.rating .num[itemprop="ratingValue"]')?.text()?.trim() || "0";
      const ratingBar = $(".rating .rtb span")?.attr("style") || "";
      const ratingPercent = ratingBar.match(/width:(\d+)%/)?.[1] || "0";
      const ratingCount = $('.rating [itemprop="ratingCount"]')?.attr("content") || "0";
      const status = $('.tsinfo .imptdt:contains("Status") i')?.text()?.trim() || "";
      const type = $('.tsinfo .imptdt:contains("Type") a')?.text()?.trim() || "";
      const released = $('.tsinfo .imptdt:contains("Released") i')?.text()?.trim() || "";
      const author = $('.tsinfo .imptdt:contains("Author") i')?.text()?.trim() || "";
      const artist = $('.tsinfo .imptdt:contains("Artist") i')?.text()?.trim() || "";
      const postedBy = $('.tsinfo .imptdt:contains("Posted By") [itemprop="name"]')?.text()?.trim() || "";
      const postedOn = $('.tsinfo .imptdt:contains("Posted On") time')?.attr("datetime") || "";
      const updatedOn = $('.tsinfo .imptdt:contains("Updated On") time')?.attr("datetime") || "";
      const views = $('.tsinfo .imptdt:contains("Views") .ts-views-count')?.text()?.trim() || "0";
      const synopsis = $(".entry-content p")?.first()?.text()?.trim() || "";
      const postId = $(".thumb img")?.attr("post-id") || "";
      const followed = $(".bmc span[data-favorites-post-count-id]")?.text()?.trim() || "0";
      const genres = [];
      $(".mgen a").each((i, el) => {
        const genre = $(el)?.text()?.trim() || "";
        const genreUrl = $(el)?.attr("href") || "";
        if (genre) {
          genres.push({
            name: genre,
            url: genreUrl
          });
        }
      });
      const chapters = [];
      $(".eplister ul li").each((i, el) => {
        const $el = $(el);
        const $a = $el.find(".eph-num a");
        const chNum = $el.attr("data-num") || "";
        const isFirst = $el.hasClass("first-chapter") || false;
        chapters.push({
          title: $a.find(".chapternum")?.text()?.trim() || "",
          url: $a?.attr("href") || "",
          date: $a.find(".chapterdate")?.text()?.trim() || "",
          number: chNum || "",
          isFirst: isFirst
        });
      });
      const relatedSeries = [];
      $('.bixbox:has(.releases h2:contains("Related")) .listupd .bs').each((i, el) => {
        const $el = $(el);
        const $link = $el.find(".bsx a");
        const $img = $el.find("img");
        const $title = $el.find(".bigor .tt");
        const $chapter = $el.find(".epxs");
        const $rating = $el.find(".numscore");
        const $type = $el.find(".type");
        const $status = $el.find(".status");
        const $hot = $el.find(".hotx");
        relatedSeries.push({
          title: $title?.text()?.trim() || "",
          url: $link?.attr("href") || "",
          thumbnail: $img?.attr("src") || $img?.attr("data-src") || "",
          latestChapter: $chapter?.text()?.trim() || "",
          rating: parseFloat($rating?.text()?.trim()) || 0,
          type: $type?.text()?.trim() || "",
          status: $status?.text()?.trim() || "Ongoing",
          isHot: $hot?.length > 0 || false
        });
      });
      console.log(`[DETAIL] Berhasil: ${title} dengan ${chapters.length} chapter`);
      return {
        ok: true,
        data: {
          title: title,
          altTitle: altTitle,
          thumbnail: thumbnail,
          rating: parseFloat(rating) || 0,
          ratingPercent: parseInt(ratingPercent) || 0,
          ratingCount: parseInt(ratingCount) || 0,
          status: status,
          type: type,
          released: released,
          author: author,
          artist: artist,
          postedBy: postedBy,
          postedOn: postedOn,
          updatedOn: updatedOn,
          views: parseInt(views) || 0,
          followed: parseInt(followed) || 0,
          postId: postId,
          synopsis: synopsis,
          genres: genres,
          chapters: chapters,
          relatedSeries: relatedSeries,
          totalChapters: chapters.length,
          totalRelated: relatedSeries.length
        }
      };
    } catch (e) {
      console.error(`[DETAIL] Error: ${e?.message || e}`);
      return {
        ok: false,
        error: e?.message || "Terjadi kesalahan"
      };
    }
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`[DOWNLOAD] Memproses chapter URL: ${url}`);
    try {
      const {
        data
      } = await axios.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const title = $(".entry-title")?.text()?.trim() || "";
      const allChaptersText = $(".allc")?.text()?.trim() || "";
      const mangaTitle = $(".allc a")?.text()?.trim() || "";
      const mangaUrl = $(".allc a")?.attr("href") || "";
      const postId = $("article")?.attr("id")?.replace("post-", "") || "";
      const description = $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content") || $(".chdesc p").text().trim() || "";
      const images = [];
      let indexCounter = 0;
      $("noscript").each((_, el) => {
        const noscriptContent = $(el).html();
        const $nos = cheerio.load(noscriptContent);
        $nos("img").each((_, img) => {
          const src = $nos(img).attr("src") || $nos(img).attr("data-src") || "";
          const alt = $nos(img).attr("alt") || "";
          const dataIndex = $nos(img).attr("data-index") || "";
          const dataServer = $nos(img).attr("data-server") || "";
          if (src && !src.includes("readerarea.svg") && !images.some(img => img.url === src)) {
            images.push({
              url: src,
              alt: alt,
              index: parseInt(dataIndex) || indexCounter++,
              server: dataServer || "Server1"
            });
          }
        });
      });
      $("script").each((_, el) => {
        const scriptContent = $(el).html();
        if (scriptContent && scriptContent.includes("sources")) {
          const matches = scriptContent.match(/https:\/\/[^"']+\.(webp|jpg|jpeg|png|gif)/g);
          if (matches) {
            matches.forEach(src => {
              if (src && !images.some(img => img.url === src)) {
                images.push({
                  url: src,
                  alt: "",
                  index: indexCounter++,
                  server: "Server1"
                });
              }
            });
          }
        }
      });
      if (images.length === 0) {
        $("#readerarea img").each((i, el) => {
          const $img = $(el);
          const src = $img?.attr("src") || $img?.attr("data-src") || "";
          const alt = $img?.attr("alt") || "";
          const dataIndex = $img?.attr("data-index") || "";
          const dataServer = $img?.attr("data-server") || "";
          if (src && !src.includes("readerarea.svg")) {
            images.push({
              url: src,
              alt: alt,
              index: parseInt(dataIndex) || i,
              server: dataServer || "Server1"
            });
          }
        });
      }
      const prevUrl = $(".ch-prev-btn")?.attr("href") || null;
      const nextUrl = $(".ch-next-btn")?.attr("href") || null;
      const prevText = $(".ch-prev-btn")?.text()?.trim() || "";
      const nextText = $(".ch-next-btn")?.text()?.trim() || "";
      const chapterList = [];
      $("#chapter option").each((i, el) => {
        const $opt = $(el);
        const val = $opt?.attr("value") || "";
        const txt = $opt?.text()?.trim() || "";
        const selected = $opt?.attr("selected") === "selected";
        const dataId = $opt?.attr("data-id") || "";
        if (val && !$opt?.attr("disabled")) {
          chapterList.push({
            title: txt,
            url: val,
            selected: selected,
            postId: dataId
          });
        }
      });
      const relatedSeries = [];
      $('.bixbox:has(.releases h2:contains("Related")) .listupd .bs').each((i, el) => {
        const $el = $(el);
        const $link = $el.find(".bsx a");
        const $img = $el.find("img");
        const $title = $el.find(".bigor .tt");
        const $chapter = $el.find(".epxs");
        const $rating = $el.find(".numscore");
        const $type = $el.find(".type");
        const $status = $el.find(".status");
        const $hot = $el.find(".hotx");
        relatedSeries.push({
          title: $title?.text()?.trim() || "",
          url: $link?.attr("href") || "",
          thumbnail: $img?.attr("src") || $img?.attr("data-src") || "",
          latestChapter: $chapter?.text()?.trim() || "",
          rating: parseFloat($rating?.text()?.trim()) || 0,
          type: $type?.text()?.trim() || "",
          status: $status?.text()?.trim() || "Ongoing",
          isHot: $hot?.length > 0 || false
        });
      });
      const tags = [];
      $(".chaptertags p")?.text()?.split(",").forEach(tag => {
        const t = tag?.trim();
        if (t && !t.includes("read manga") && !t.includes("comic")) {
          tags.push(t);
        }
      });
      const publishedDate = $('.chaptertags time[itemprop="datePublished"]')?.attr("datetime") || "";
      const author = $('.chaptertags [itemprop="author"]')?.text()?.trim() || "";
      console.log(`[DOWNLOAD] Berhasil: ${images.length} gambar ditemukan`);
      return {
        ok: true,
        data: {
          title: title,
          mangaTitle: mangaTitle,
          mangaUrl: mangaUrl,
          postId: postId,
          description: description,
          images: images,
          prevUrl: prevUrl,
          nextUrl: nextUrl,
          prevText: prevText,
          nextText: nextText,
          chapterList: chapterList,
          relatedSeries: relatedSeries,
          tags: tags,
          publishedDate: publishedDate,
          author: author,
          totalImages: images.length,
          totalChapters: chapterList.length,
          totalRelated: relatedSeries.length
        }
      };
    } catch (e) {
      console.error(`[DOWNLOAD] Error: ${e?.message || e}`);
      return {
        ok: false,
        error: e?.message || "Terjadi kesalahan"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new SoulscansScraper();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Paramenter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: "Paramenter 'url' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: "Paramenter 'url' wajib diisi untuk action 'download'."
          });
        }
        response = await api.download(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'detail', dan 'download'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}