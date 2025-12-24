import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class SamehadakuScraper {
  constructor(proxyBaseUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v8?url=`, samehadakuBaseUrl = "https://samehadaku.now/") {
    this.proxy_base_url = proxyBaseUrl;
    this.samehadaku_base_url = samehadakuBaseUrl;
  }
  async search({
    query
  }) {
    if (!query) {
      throw new Error("Query pencarian tidak boleh kosong.");
    }
    const targetUrl = `${this.samehadaku_base_url}?s=${encodeURIComponent(query)}`;
    const proxyUrl = `${this.proxy_base_url}${encodeURIComponent(targetUrl)}`;
    try {
      const {
        data
      } = await axios.get(proxyUrl);
      const $ = cheerio.load(data);
      return $("#main article.animpost").map((index, element) => {
        const $el = $(element);
        const genres = [];
        $el.find(".stooltip.left .genres .mta a").each((i, genreEl) => {
          genres.push($(genreEl).text().trim());
        });
        return {
          title: $el.find(".animepost .animposx .data .title h2").text().trim(),
          url: $el.find(".animepost .animposx a").attr("href"),
          image_url: $el.find(".animepost .animposx .content-thumb img").attr("src"),
          type: $el.find(".animepost .animposx .content-thumb .type").text().trim(),
          score: $el.find(".animepost .animposx .content-thumb .score").text().replace("fa fa-star", "").trim(),
          status: $el.find(".animepost .animposx .data .type").text().trim(),
          description: $el.find(".stooltip.left .ttls").text().trim(),
          genres: genres
        };
      }).get();
    } catch (error) {
      console.error("Terjadi kesalahan saat pencarian:", error.message);
      throw error;
    }
  }
  async detail({
    url
  }) {
    if (!url) {
      throw new Error("URL detail tidak boleh kosong.");
    }
    const proxyUrl = `${this.proxy_base_url}${encodeURIComponent(url)}`;
    try {
      const {
        data
      } = await axios.get(proxyUrl);
      const $ = cheerio.load(data);
      const title = $(".player-area header.info_episode .entry-title").text().trim();
      const description = $(".infoanime .infox .desc .entry-content-single").text().trim();
      const imageUrl = $(".infoanime .thumb img.anmsa").attr("src");
      const score = $('.infoanime .thumb .rt .rating-area .rtg span[itemprop="ratingValue"]').text().trim();
      const genres = [];
      $(".infoanime .infox .genre-info a").each((index, element) => {
        genres.push($(element).text().trim());
      });
      const episodes = [];
      $(".lstepsiode.listeps ul li").each((index, element) => {
        const $el = $(element);
        episodes.push({
          episode_number: $el.find(".epsright .eps a").text().trim(),
          episode_title: $el.find(".epsleft .lchx a").text().trim(),
          episode_url: $el.find(".epsleft .lchx a").attr("href"),
          release_date: $el.find(".epsleft .date").text().trim()
        });
      });
      const batchDownloadUrl = $(".listbatch a").attr("href") || null;
      return {
        title: title,
        description: description,
        image_url: imageUrl,
        score: score,
        genres: genres,
        batch_download_url: batchDownloadUrl,
        episodes: episodes
      };
    } catch (error) {
      console.error("Terjadi kesalahan saat mengambil detail:", error.message);
      throw error;
    }
  }
  async download({
    url
  }) {
    if (!url) {
      throw new Error("URL download tidak boleh kosong.");
    }
    const proxyUrl = `${this.proxy_base_url}${encodeURIComponent(url)}`;
    try {
      const {
        data
      } = await axios.get(proxyUrl);
      const $ = cheerio.load(data);
      const episodeTitle = $(".player-area header.info_episode .entry-title").text().trim();
      const episodeDescription = $(".player-area header.info_episode .entry-content-single").text().trim();
      const releaseInfo = $(".player-area header.info_episode .sbdbti .time-post").text().trim().replace(" years yang lalu", " lalu");
      const downloadLinks = [];
      $("#downloadb ul li").each((index, element) => {
        const $li = $(element);
        const quality = $li.find("strong").text().trim();
        const links = [];
        $li.find("span a").each((i, linkEl) => {
          links.push({
            host: $(linkEl).text().trim(),
            url: $(linkEl).attr("href")
          });
        });
        if (quality && links.length > 0) {
          downloadLinks.push({
            quality: quality,
            links: links
          });
        }
      });
      const playerOptions = [];
      $("#server ul li").each((index, element) => {
        const $li = $(element);
        const optionDiv = $li.find(".east_player_option");
        if (optionDiv.length) {
          playerOptions.push({
            id: optionDiv.attr("id"),
            name: optionDiv.find("span").text().trim(),
            data_post: optionDiv.data("post"),
            data_nume: optionDiv.data("nume"),
            data_type: optionDiv.data("type"),
            is_active: optionDiv.hasClass("on")
          });
        }
      });
      const notesElement = $(".pencenter p strong span").first();
      const notes = notesElement.length ? notesElement.text().trim() : null;
      return {
        episode_title: episodeTitle,
        episode_description: episodeDescription,
        release_info: releaseInfo,
        player_options: playerOptions,
        download_links: downloadLinks,
        notes: notes
      };
    } catch (error) {
      console.error("Terjadi kesalahan saat mengambil tautan unduhan:", error.message);
      throw error;
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
        action: "search | detail | download"
      }
    });
  }
  const scraper = new SamehadakuScraper();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await scraper[action](params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await scraper[action](params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await scraper[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | detail | download`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}