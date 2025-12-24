import axios from "axios";
import * as cheerio from "cheerio";
class AnimeKuIndo {
  constructor() {
    this.baseURL = "https://animekuindo.live";
    this.headers = {
      authority: "www.blogger.com",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      referer: "https://animekuindo.live/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "upgrade-insecure-requests": "1",
      priority: "u=0, i"
    };
  }
  cleanText(str) {
    return str?.replace(/\n/g, " ")?.replace(/\s+/g, " ")?.trim() || "";
  }
  async fetchHtml(url, customHeaders = {}) {
    const finalHeaders = {
      ...this.headers,
      ...customHeaders
    };
    try {
      console.log(`[LOG] HTTP GET: ${url}`);
      const {
        data
      } = await axios.get(url, {
        headers: finalHeaders
      });
      return data;
    } catch (error) {
      console.error(`[ERROR] Fetch Fail [${url}]: ${error.message}`);
      return null;
    }
  }
  parseGridItems($, selector) {
    const items = [];
    $(selector).each((i, el) => {
      try {
        const $el = $(el);
        const aTag = $el.find("a.tip");
        const url = aTag.length ? aTag.attr("href") : $el.find("a").attr("href");
        if (!url || url.includes("t.me")) return;
        items.push({
          title: this.cleanText($el.find(".tt h2, .tt").text()),
          url: url,
          thumb: $el.find("img").attr("src")?.split("?")[0],
          status: this.cleanText($el.find(".status").text()) || "Unknown",
          type: this.cleanText($el.find(".typez").text()) || "TV",
          episode: this.cleanText($el.find(".bt .epx").text()) || "-",
          sub_type: this.cleanText($el.find(".bt .sb").text()) || "Sub"
        });
      } catch (e) {
        console.error(`[WARN] Failed parsing grid item index ${i}: ${e.message}`);
      }
    });
    return items;
  }
  async home() {
    try {
      console.log("[LOG] Memulai scraping Home...");
      const html = await this.fetchHtml(this.baseURL);
      if (!html) throw new Error("Empty home HTML");
      const $ = cheerio.load(html);
      const result = {
        popular: [],
        latest: [],
        top_rating: [],
        blog: []
      };
      $(".popconslide article.bs").each((i, el) => {
        const $el = $(el);
        result.popular.push({
          title: this.cleanText($el.find(".tt h2").text()),
          url: $el.find("a").first().attr("href"),
          thumb: $el.find("img").attr("src")?.split("?")[0],
          episode: this.cleanText($el.find(".bt .epx").text()),
          status: this.cleanText($el.find(".status").text()) || "Unknown",
          type: this.cleanText($el.find(".typez").text())
        });
      });
      $(".listupd.normal article.bs.styleegg").each((i, el) => {
        const $el = $(el);
        result.latest.push({
          title: this.cleanText($el.find(".egghead .eggtitle").text()),
          url: $el.find("a").first().attr("href"),
          thumb: $el.find("img").attr("src")?.split("?")[0],
          episode: this.cleanText($el.find(".eggepisode").text()),
          type: this.cleanText($el.find(".eggtype").text()),
          is_hot: $el.find(".hotbadge").length > 0
        });
      });
      const $sections = $(".bixbox");
      $sections.each((i, section) => {
        const $section = $(section);
        const heading = $section.find(".releases h3").text();
        if (heading.includes("Top Rating")) {
          $section.find(".listupd article.bs").each((j, article) => {
            const $article = $(article);
            result.top_rating.push({
              title: this.cleanText($article.find(".tt h2").text()),
              url: $article.find("a").first().attr("href"),
              episode: this.cleanText($article.find(".bt .epx").text()),
              thumb: $article.find("img").attr("src")?.split("?")[0]
            });
          });
        }
      });
      $(".bloglist article.blogbox").each((i, el) => {
        const $el = $(el);
        result.blog.push({
          title: this.cleanText($el.find(".entry-title a").text()),
          url: $el.find(".entry-title a").attr("href"),
          date: this.cleanText($el.find(".entry-meta time").text()),
          thumb: $el.find(".thumb img").attr("src")
        });
      });
      return {
        status: true,
        data: result
      };
    } catch (error) {
      console.error(`[ERROR] Home: ${error.message}`);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async search({
    query,
    limit = 5,
    detail = false,
    download = false
  }) {
    const resultContainer = [];
    try {
      const searchUrl = `${this.baseURL}/?s=${encodeURIComponent(query)}`;
      console.log(`[LOG] Search Start: ${query}`);
      const html = await this.fetchHtml(searchUrl);
      if (!html) return {
        status: false,
        message: "Empty HTML"
      };
      const $ = cheerio.load(html);
      const articles = $(".listupd article.bs").toArray();
      let count = 0;
      for (const el of articles) {
        if (count >= limit) break;
        try {
          const node = $(el);
          let aTag = node.find(".bsx a.tip");
          if (aTag.length === 0) aTag = node.find('.bsx a[itemprop="url"]');
          const href = aTag.attr("href");
          if (href && !href.includes("t.me") && href.startsWith("http")) {
            const baseInfo = {
              title: this.cleanText(node.find(".tt h2").text()),
              url: href,
              thumb: node.find("img").attr("src")?.split("?")[0],
              type: this.cleanText(node.find(".typez").text()),
              status: this.cleanText(node.find(".status").text()) || "Ongoing",
              episode: this.cleanText(node.find(".bt .epx").text())
            };
            if (detail) {
              console.log(`[LOG] Getting Detail for: ${baseInfo.title}`);
              const detailData = await this.detail({
                url: href
              });
              if (detailData.status) {
                baseInfo.details = detailData.data;
                if (download && detailData.data.episode_list?.length > 0) {
                  const epTarget = detailData.data.episode_list[0];
                  if (epTarget && epTarget.url) {
                    console.log(`[LOG] Getting Download Data for Ep: ${epTarget.title}`);
                    const dlData = await this.download({
                      url: epTarget.url
                    });
                    if (dlData.status) {
                      baseInfo.latest_download = dlData.data;
                    }
                  }
                }
              }
            }
            resultContainer.push(baseInfo);
            count++;
          }
        } catch (innerErr) {
          console.error(`[WARN] Error parsing item ${count}: ${innerErr.message}`);
        }
      }
      return {
        status: true,
        result_count: resultContainer.length,
        data: resultContainer
      };
    } catch (err) {
      console.error("[ERROR] Search Process:", err.message);
      return {
        status: false,
        message: err.message
      };
    }
  }
  async detail({
    url
  }) {
    try {
      console.log(`[LOG] Processing Detail Page...`);
      const html = await this.fetchHtml(url);
      if (!html) throw new Error("Empty detail HTML");
      const $ = cheerio.load(html);
      const metaInfo = {};
      $(".spe span").each((i, el) => {
        const node = $(el);
        let key = node.find("b").text().replace(":", "").trim();
        node.find("b").remove();
        let val = node.text().trim();
        if (node.find("a").length > 0) {
          val = node.find("a").map((_, a) => $(a).text().trim()).get().join(", ");
        }
        if (key) {
          key = key.toLowerCase().replace(/\s/g, "_");
          metaInfo[key] = val;
        }
      });
      const episodes = [];
      $(".eplister ul li").each((i, el) => {
        try {
          episodes.push({
            episode: this.cleanText($(el).find(".epl-num").text()),
            title: this.cleanText($(el).find(".epl-title").text()),
            date: this.cleanText($(el).find(".epl-date").text()),
            url: $(el).find("a").attr("href")
          });
        } catch (e) {}
      });
      let rating = null;
      const ratingText = $(".rating strong").text();
      if (ratingText) {
        rating = ratingText.replace("Rating", "").trim();
      }
      if (!rating || rating === "") {
        rating = $(".rating .numscore").text().trim();
      }
      let season = null;
      $(".spe span").each((i, el) => {
        const $span = $(el);
        const labelText = $span.find("b").text();
        if (labelText && labelText.toLowerCase().includes("season")) {
          $span.find("b").remove();
          const seasonLink = $span.find("a");
          if (seasonLink.length > 0) {
            season = this.cleanText(seasonLink.text());
          } else {
            season = this.cleanText($span.text());
          }
        }
      });
      const result = {
        title: this.cleanText($(".infox h1.entry-title").text()),
        alt_title: this.cleanText($(".infox .alter").text()),
        thumbnail: $(".thumb img").attr("src"),
        rating: rating,
        season: season,
        synopsis: this.cleanText($('.entry-content[itemprop="description"]').text()),
        genres: $(".genxed a").map((_, el) => $(el).text().trim()).get(),
        info_metadata: metaInfo,
        episode_list: episodes
      };
      return {
        status: true,
        data: result
      };
    } catch (e) {
      console.error("[ERROR] Detail Scraper:", e.message);
      return {
        status: false,
        message: e.message
      };
    }
  }
  async download({
    url
  }) {
    try {
      console.log(`[LOG] Extracting Video Page: ${url}`);
      const html = await this.fetchHtml(url);
      if (!html) throw new Error("Empty download HTML");
      const $ = cheerio.load(html);
      const title = this.cleanText($(".entry-title").text());
      const targetUrls = new Set();
      const mainFrame = $("#pembed iframe").attr("src") || $("#embed_holder iframe").attr("src");
      if (mainFrame) targetUrls.add(mainFrame);
      $("select.mirror option").each((i, el) => {
        const $el = $(el);
        const val = $el.val();
        const label = this.cleanText($el.text());
        if (val && !label.includes("Pilih")) {
          let decodedUrl = val;
          if (!val.startsWith("http") && val.length > 20) {
            try {
              const buffer = Buffer.from(val, "base64");
              decodedUrl = buffer.toString("utf-8");
              const matchSrc = decodedUrl.match(/src="([^"]+)"/);
              if (matchSrc && matchSrc[1]) {
                decodedUrl = matchSrc[1];
              }
            } catch (e) {}
          }
          if (decodedUrl.startsWith("http")) {
            targetUrls.add(decodedUrl);
          }
        }
      });
      const blogLinks = [];
      for (const u of targetUrls) {
        if (u.includes("blogger.com") || u.includes("video.g")) {
          blogLinks.push(u);
        }
      }
      console.log(`[LOG] Found ${blogLinks.length} blogger/google video sources to process.`);
      const allStreams = [];
      const blogHeaders = {
        Authority: "www.blogger.com",
        Referer: this.baseURL + "/",
        "User-Agent": this.headers["user-agent"]
      };
      for (const blogUrl of blogLinks) {
        try {
          console.log(`[LOG] Processing mirror: ${blogUrl.substring(0, 60)}...`);
          const iframeHtml = await this.fetchHtml(blogUrl, blogHeaders);
          if (iframeHtml) {
            const configRegex = /var\s+VIDEO_CONFIG\s*=\s*(\{.*\});?/;
            const match = iframeHtml.match(configRegex);
            if (match && match[1]) {
              const jsonConfig = JSON.parse(match[1]);
              const streams = jsonConfig.streams || [];
              for (const st of streams) {
                if (!allStreams.find(s => s.url === st.play_url)) {
                  let qName = `Unknown (ID:${st.format_id})`;
                  if (st.format_id == 18) qName = "360p (MP4)";
                  else if (st.format_id == 22) qName = "720p (MP4)";
                  else if (st.format_id == 37) qName = "1080p (MP4)";
                  allStreams.push({
                    quality: qName,
                    format_id: st.format_id,
                    url: st.play_url,
                    source: blogUrl
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error(`[WARN] Failed processing ${blogUrl}: ${err.message}`);
        }
      }
      allStreams.sort((a, b) => b.format_id - a.format_id);
      const mirrorsInfo = [];
      for (const u of targetUrls) {
        mirrorsInfo.push({
          url: u,
          type: u.includes("blogger.com") || u.includes("video.g") ? "Blogger Video" : "External"
        });
      }
      const downloadLinks = [];
      $(".entry-content p a").each((i, el) => {
        const $el = $(el);
        const href = $el.attr("href");
        const text = this.cleanText($el.text());
        if (href && !href.includes("facebook") && !href.includes("twitter") && !href.includes("whatsapp")) {
          downloadLinks.push({
            quality: text,
            link: href
          });
        }
      });
      return {
        status: true,
        data: {
          title: title,
          navigation: {
            prev: $(".naveps a[rel='prev']").attr("href") || null,
            next: $(".naveps a[rel='next']").attr("href") || null,
            all: $(".naveps .nvsc a").attr("href") || null
          },
          video_streams: allStreams,
          mirrors: mirrorsInfo,
          download_links: downloadLinks
        }
      };
    } catch (e) {
      console.error("[ERROR] Download Scraper:", e.message);
      return {
        status: false,
        message: e.message
      };
    }
  }
  async anime_list({
    page = 1
  }) {
    try {
      const url = `${this.baseURL}/anime/?page=${page}`;
      console.log(`[LOG] Scraping Anime List Page: ${page}`);
      const html = await this.fetchHtml(url);
      if (!html) throw new Error("Empty HTML");
      const $ = cheerio.load(html);
      const animeData = this.parseGridItems($, ".listupd article.bs");
      const hasNextPage = $(".hpage a.r").length > 0 || $(".pagination .next").length > 0;
      return {
        status: true,
        page: parseInt(page),
        has_next: hasNextPage,
        data: animeData
      };
    } catch (e) {
      console.error("[ERROR] Anime List Scraper:", e.message);
      return {
        status: false,
        message: e.message
      };
    }
  }
  async ongoing({
    page = 1
  }) {
    try {
      const url = `${this.baseURL}/anime-baru-dirilis/page/${page}/`;
      console.log(`[LOG] Scraping Ongoing Page: ${page}`);
      const html = await this.fetchHtml(url);
      if (!html) throw new Error("Empty HTML");
      const $ = cheerio.load(html);
      const animeData = this.parseGridItems($, ".listupd article.bs");
      const hasNextPage = $(".pagination .next").length > 0;
      return {
        status: true,
        page: parseInt(page),
        has_next: hasNextPage,
        data: animeData
      };
    } catch (e) {
      console.error("[ERROR] Ongoing Scraper:", e.message);
      return {
        status: false,
        message: e.message
      };
    }
  }
  async top_rating({
    page = 1
  }) {
    try {
      const url = `${this.baseURL}/top-rating/page/${page}/`;
      console.log(`[LOG] Scraping Top Rating Page: ${page}`);
      const html = await this.fetchHtml(url);
      if (!html) throw new Error("Empty HTML");
      const $ = cheerio.load(html);
      const animeData = this.parseGridItems($, ".listupd article.bs");
      const hasNextPage = $(".pagination .next").length > 0;
      return {
        status: true,
        page: parseInt(page),
        has_next: hasNextPage,
        data: animeData
      };
    } catch (e) {
      console.error("[ERROR] Top Rating Scraper:", e.message);
      return {
        status: false,
        message: e.message
      };
    }
  }
  async movie({
    page = 1
  }) {
    try {
      const url = `${this.baseURL}/movie/page/${page}/`;
      console.log(`[LOG] Scraping Movie Page: ${page}`);
      const html = await this.fetchHtml(url);
      if (!html) throw new Error("Empty HTML");
      const $ = cheerio.load(html);
      const animeData = this.parseGridItems($, ".listupd article.bs");
      const hasNextPage = $(".pagination .next").length > 0;
      return {
        status: true,
        page: parseInt(page),
        has_next: hasNextPage,
        data: animeData
      };
    } catch (e) {
      console.error("[ERROR] Movie Scraper:", e.message);
      return {
        status: false,
        message: e.message
      };
    }
  }
  async schedule() {
    try {
      const url = `${this.baseURL}/jadwal/`;
      console.log(`[LOG] Scraping Schedule`);
      let html = await this.fetchHtml(url);
      if (!html) {
        console.log(`[LOG] Failed fetching /jadwal/, trying baseURL`);
        html = await this.fetchHtml(this.baseURL);
      }
      if (!html) throw new Error("Empty HTML for Schedule");
      const $ = cheerio.load(html);
      const scheduleData = [];
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      days.forEach((day, index) => {
        const dayClass = `.sch_${day}`;
        const dayContainer = $(dayClass);
        const dayItems = [];
        dayContainer.find(".listupd .bs").each((i, el) => {
          const $el = $(el);
          const timeText = this.cleanText($el.find(".bt .epx").text());
          const link = $el.find(".bsx a").attr("href");
          if (link && !link.includes("t.me")) {
            dayItems.push({
              title: this.cleanText($el.find(".tt").text()),
              url: link,
              thumb: $el.find("img").attr("src")?.split("?")[0],
              time_release: timeText,
              episode: this.cleanText($el.find(".bt .sb").text())
            });
          }
        });
        if (dayItems.length > 0) {
          scheduleData.push({
            day: dayNames[index],
            key: day,
            anime: dayItems
          });
        }
      });
      return {
        status: true,
        data: scheduleData
      };
    } catch (e) {
      console.error("[ERROR] Schedule Scraper:", e.message);
      return {
        status: false,
        message: e.message
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
      error: "Parameter 'action' wajib diisi.",
      actions: ["home", "search", "detail", "download", "anime_list", "ongoing", "top_rating", "movie", "schedule"]
    });
  }
  const api = new AnimeKuIndo();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home();
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: "Parameter 'url' wajib diisi untuk action 'detail'. Contoh url: https://animekuindo.live/anime/boku-no-hero.../"
          });
        }
        response = await api.detail(params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: "Parameter 'url' wajib diisi untuk action 'download'. URL harus berupa halaman episode, bukan halaman info anime."
          });
        }
        response = await api.download(params);
        break;
      case "anime_list":
        response = await api.anime_list(params);
        break;
      case "ongoing":
        response = await api.ongoing(params);
        break;
      case "top_rating":
        response = await api.top_rating(params);
        break;
      case "movie":
        response = await api.movie(params);
        break;
      case "schedule":
        response = await api.schedule();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: ["home", "search", "detail", "download", "anime_list", "ongoing", "top_rating", "movie", "schedule"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}