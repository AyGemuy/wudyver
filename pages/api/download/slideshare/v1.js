import axios from "axios";
import * as cheerio from "cheerio";
class SlideShare {
  constructor() {
    this.base = "https://www.slideshare.net";
    this.gql = "https://api.slidesharecdn.com/graphql";
    this.saverApi = "https://slidesaver.app/api";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.slideshare.net/"
    };
    this.saverHeaders = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
      Referer: "https://slidesaver.app/"
    };
  }
  async req(url, method = "GET", data = null, headers = {}) {
    try {
      const res = await axios({
        url: url,
        method: method,
        data: data,
        headers: {
          ...this.headers,
          ...headers
        },
        timeout: 15e3
      });
      return res?.data;
    } catch (e) {
      console.error(`[Error] Request failed: ${e.message}`);
      return null;
    }
  }
  clean(str) {
    return str?.replace(/[\n\t]+/g, " ").replace(/\s+/g, " ").trim() || "";
  }
  async createSlide(images, type = "pdf") {
    try {
      console.log(`[POST] Creating ${type} with ${images?.length || 0} images`);
      const {
        data
      } = await axios.post(`${this.saverApi}/get-slide`, {
        images: images,
        type: type
      }, {
        headers: {
          ...this.saverHeaders,
          "Content-Type": "application/json"
        }
      });
      console.log(`[SUCCESS] File ready: ${data?.download_url || "N/A"}`);
      return data;
    } catch (err) {
      console.error(`[ERROR] createSlide:`, err?.message || err);
      return null;
    }
  }
  async search({
    query,
    ...rest
  }) {
    const q = `query ($query: String!, $language: String, $sort: Sort, $first: Int, $period: Period) {
            search {
                slideshows(query: $query, language: $language, sort: $sort, first: $first, period: $period) {
                    edges { node { ... on Slideshow { title canonicalUrl thumbnail views totalSlides user { name } } } }
                }
            }
        }`;
    const vars = {
      query: query || "",
      language: rest?.lang || "en",
      sort: rest?.sort || "RELEVANT",
      first: parseInt(rest?.limit) || 10,
      period: rest?.period || "ANYTIME"
    };
    try {
      const res = await this.req(this.gql, "POST", {
        query: q,
        variables: vars
      }, {
        "Content-Type": "application/json"
      });
      return res?.data?.search?.slideshows?.edges?.map(e => ({
        title: e?.node?.title,
        url: e?.node?.canonicalUrl,
        thumb: e?.node?.thumbnail,
        author: e?.node?.user?.name,
        views: e?.node?.views,
        count: e?.node?.totalSlides
      })) || [];
    } catch (e) {
      return [];
    }
  }
  async download({
    url,
    format,
    type,
    ...rest
  }) {
    try {
      const html = await this.req(url);
      if (!html) throw new Error("Gagal mengambil HTML atau halaman kosong.");
      const $ = cheerio.load(html);
      const metadata = {
        title: this.clean($('h1[class*="Metadata_title"]').text()) || $('meta[property="og:title"]').attr("content"),
        description: this.clean($('[data-cy="document-description"]').text()) || $('meta[property="og:description"]').attr("content"),
        author: this.clean($('.uploader-tag a[href^="https://www.slideshare.net/"]').first().text()) || "Unknown",
        category: this.clean($(".CategoryLinks_root__f1kT8 a").first().text()) || "Uncategorized",
        views: parseInt($('span[class*="MetaTag_tag"]:contains("views")').text().replace(/[^0-9]/g, "")) || 0,
        likes: parseInt($('button[data-cy="like-button"] span').text().replace(/[^0-9]/g, "")) || 0,
        format: this.clean($('span[data-bridge="true"]').text()) || "Presentation",
        upload_date: $('meta[itemprop="datePublished"]').attr("content") || null,
        updated_date: $('meta[itemprop="dateModified"]').attr("content") || null
      };
      const slides = [];
      $(".VerticalPlayer_root__K8_YS .slide-item").each((i, el) => {
        const $img = $(el).find('img[data-testid="vertical-slide-image"]');
        let imgUrl = null;
        const srcset = $img.attr("srcset");
        const src = $img.attr("src");
        if (srcset) {
          const sources = srcset.split(",").map(s => {
            const [u, w] = s.trim().split(" ");
            return {
              url: u,
              width: parseInt(w || "0")
            };
          }).sort((a, b) => b.width - a.width);
          if (sources.length > 0) imgUrl = sources[0].url;
        }
        if (!imgUrl && src && !src.startsWith("data:")) {
          imgUrl = src;
        }
        if (imgUrl) {
          slides.push({
            index: i + 1,
            url: imgUrl,
            alt: this.clean($img.attr("alt"))
          });
        }
      });
      const transcript = [];
      $('ul[class*="Transcript_list"] li').each((i, el) => {
        const $el = $(el);
        const contentDiv = $el.find("div").first();
        const text = this.clean(contentDiv.text());
        if (text) {
          transcript.push({
            index: i + 1,
            text: text
          });
        }
      });
      const related = [];
      $(".slideshow-card").each((i, el) => {
        const $card = $(el);
        const title = this.clean($card.find('[data-cy="slideshow-title"]').text());
        const link = $card.find('[data-cy="slideshow-card-link"]').attr("href");
        const author = this.clean($card.find('[data-testid="slideshow-author"]').text());
        const format = this.clean($card.find(".ExtensionLabel_root__UXb76").text());
        if (title && link) {
          related.push({
            title: title,
            url: link.startsWith("http") ? link : this.base + link,
            author: author,
            format: format
          });
        }
      });
      let pdfUrl = null;
      try {
        const jsonLd = JSON.parse($('script[type="application/ld+json"]').html() || "{}");
        if (jsonLd.downloadUrl) pdfUrl = jsonLd.downloadUrl;
      } catch (e) {}
      let downloadLink = null;
      try {
        const finalType = format || type || "pdf";
        const images = slides.map(s => s?.url).filter(Boolean);
        if (images.length > 0) {
          console.log(`[START] SlideSaver download: type=${finalType}, images=${images.length}`);
          const result = await this.createSlide(images, finalType);
          downloadLink = result?.download_url || null;
          console.log(`[DONE] SlideSaver link: ${downloadLink || "failed"}`);
        }
      } catch (err) {
        console.error(`[SKIP] SlideSaver error:`, err?.message || err);
      }
      return {
        success: true,
        info: {
          ...metadata,
          download_pdf: pdfUrl,
          download_link: downloadLink
        },
        stats: {
          total_slides: slides.length,
          has_transcript: transcript.length > 0,
          related_count: related.length
        },
        slides: slides,
        transcript: transcript,
        related: related.slice(0, 10)
      };
    } catch (e) {
      return {
        success: false,
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
      error: "Missing required field: action",
      required: {
        action: ["search", "download"]
      }
    });
  }
  const api = new SlideShare();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await api.search(params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await api.download(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`,
          allowed: ["search", "download"]
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("[API Error]", error);
    return res.status(500).json({
      error: `Processing error: ${error.message}`,
      success: false,
      code: 500
    });
  }
}