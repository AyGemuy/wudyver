import axios from "axios";
import * as cheerio from "cheerio";
class AnimeScraper {
  constructor() {
    this.baseUrl = "https://anime.ruangmoviez.my.id/";
  }
  async search({
    query,
    post_type = ["post", "tv"],
    ...rest
  }) {
    if (!query) throw new Error("Pencarian memerlukan query.");
    const searchUrl = new URL(this.baseUrl);
    searchUrl.searchParams.append("s", query);
    Array.isArray(post_type) ? post_type.forEach(type => searchUrl.searchParams.append("post_type[]", type)) : searchUrl.searchParams.append("post_type[]", post_type);
    for (const key in rest) searchUrl.searchParams.append(key, rest[key]);
    try {
      const $ = cheerio.load((await axios.get(searchUrl.toString())).data);
      return $("#main .grid-container article").map((em, el) => {
        const $el = $(el);
        const ratingText = $el.find(".gmr-rating-item span").eq(1).text().trim();
        const durationText = $el.find(".gmr-duration-item").text().trim().replace("min", "").replace(" ", "");
        return {
          title: $el.find(".entry-title a").attr("title")?.replace("Permalink to: ", "") || "Tidak Ada Judul",
          url: $el.find(".entry-title a").attr("href") || "Tidak Ada URL",
          imageUrl: $el.find(".content-thumbnail img").attr("src") || "Tidak Ada Gambar",
          rating: parseFloat(ratingText) || null,
          duration: durationText !== "N/A" ? `${durationText} min` : "N/A",
          episodes: $el.find(".gmr-numbeps span").text().trim() || "N/A",
          genres: $el.find('.gmr-movie-on a[rel="category tag"]').map((i, genreEl) => $(genreEl).text()).get(),
          country: $el.find('.gmr-movie-on span[itemprop="contentLocation"] a[rel="tag"]').text().trim() || "N/A"
        };
      }).get();
    } catch (error) {
      console.error("Terjadi kesalahan saat mencari anime:", error.message);
      return [];
    }
  }
  async detail({
    url,
    ...rest
  }) {
    if (!url) throw new Error("URL detail diperlukan.");
    try {
      const $ = cheerio.load((await axios.get(url)).data);
      const ratingValue = $('div.gmr-meta-rating span[itemprop="ratingValue"]').text().trim();
      const ratingCount = $('div.gmr-meta-rating span[itemprop="ratingCount"]').text().trim();
      const details = {};
      $(".gmr-moviedata").each((em, el) => {
        const $el = $(el);
        const key = $el.find("strong").text().trim().replace(":", "");
        let value;
        switch (key) {
          case "By":
            value = $el.find('span.entry-author a span[itemprop="name"]').text().trim();
            break;
          case "Posted on":
            value = $el.find("time.entry-date.published").attr("datetime") || $el.find("time.updated").attr("datetime") || $el.text().replace("Posted on:", "").trim();
            break;
          case "Genre":
            value = $el.find('a[rel="category tag"]').map((i, genreEl) => $(genreEl).text()).get();
            break;
          case "Year":
            value = $el.find('a[rel="tag"]').text().trim();
            break;
          case "Duration":
            value = $el.find('span[property="duration"]').text().trim();
            break;
          case "Country":
            value = $el.find('span[itemprop="contentLocation"] a').text().trim();
            break;
          case "Release":
            value = $el.find('time[itemprop="dateCreated"]').attr("datetime") || $el.find("span").text().trim();
            break;
          case "Last Air Date":
            value = $el.text().replace("Last Air Date:", "").trim();
            break;
          case "Number Of Episode":
            value = $el.text().replace("Number Of Episode:", "").trim();
            break;
          case "Network":
            value = $el.find("span a").map((i, networkEl) => $(networkEl).text()).get();
            break;
          case "Cast":
            value = $el.find('span[itemprop="actors"] a').map((i, castEl) => $(castEl).text()).get();
            break;
          default:
            value = $el.contents().not($el.children("strong, time")).text().trim();
        }
        details[key] = value === "" || Array.isArray(value) && value.length === 0 ? "N/A" : value;
      });
      const tags = $('div.tags-links-content a[rel="tag"]').map((i, tagEl) => $(tagEl).text()).get();
      return {
        title: $("h1.entry-title").text().trim() || "Tidak Ada Judul",
        thumbnail: $("figure.pull-left img").attr("src") || "Tidak Ada Thumbnail",
        synopsis: $('div.entry-content-single[itemprop="description"] > p').eq(0).text().trim() || "Tidak Ada Sinopsis",
        rating: {
          value: parseFloat(ratingValue) || null,
          count: parseInt(ratingCount) || null
        },
        episodeLinks: $(".gmr-listseries a").map((em, el) => ({
          text: $(el).text().trim(),
          url: $(el).attr("href") || "N/A",
          isActive: $(el).hasClass("active")
        })).get(),
        details: {
          by: details.By || "N/A",
          postedOn: details["Posted on"] || "N/A",
          genre: details.Genre || "N/A",
          year: details.Year || "N/A",
          duration: details.Duration || "N/A",
          country: details.Country || "N/A",
          release: details.Release || "N/A",
          lastAirDate: details["Last Air Date"] || "N/A",
          numberOfEpisode: details["Number Of Episode"] || "N/A",
          network: details.Network || "N/A",
          cast: details.Cast || "N/A",
          tags: tags.length > 0 ? tags : "N/A"
        }
      };
    } catch (error) {
      console.error(`Terjadi kesalahan saat mengambil detail dari ${url}:`, error.message);
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    if (!url) throw new Error("URL unduhan diperlukan.");
    try {
      const $ = cheerio.load((await axios.get(url)).data);
      const ratingValue = $('div.gmr-meta-rating span[itemprop="ratingValue"]').text().trim();
      const ratingCount = $('div.gmr-meta-rating span[itemprop="ratingCount"]').text().trim();
      const details = {};
      $(".gmr-moviedata").each((em, el) => {
        const $el = $(el);
        const key = $el.find("strong").text().trim().replace(":", "");
        let value = $el.contents().not($el.children("strong, time")).text().trim();
        if (key === "Posted on") {
          value = $el.find("time.entry-date.published").attr("datetime") || $el.find("time.updated").attr("datetime") || value;
        } else if (key === "By") {
          value = $el.find('span.entry-author a span[itemprop="name"]').text().trim();
        } else if (key === "Release") {
          value = $el.find('time[itemprop="dateCreated"]').attr("datetime") || $el.find("span").text().trim();
        }
        details[key] = value === "" ? "N/A" : value;
      });
      return {
        title: $("h1.entry-title").text().trim() || "Tidak Ada Judul",
        thumbnail: $("figure.pull-left img").attr("src") || "Tidak Ada Thumbnail",
        synopsis: $('div.entry-content-single[itemprop="description"] > p').eq(0).text().trim() || "Tidak Ada Sinopsis",
        rating: {
          value: parseFloat(ratingValue) || null,
          count: parseInt(ratingCount) || null
        },
        episodeDetails: {
          by: details.By || "N/A",
          postedOn: details["Posted on"] || "N/A",
          episodeName: details["Episode Name"] || "N/A",
          release: details.Release || "N/A"
        },
        downloadLinks: $("#download .gmr-download-list li a").map((em, el) => {
          const $el = $(el);
          const fullLinkTitle = $el.attr("title") || "N/A";
          const visibleLinkText = $el.text().trim();
          const linkUrl = $el.attr("href") || "N/A";
          const parts = visibleLinkText.split("|").map(p => p.trim());
          const quality = parts[0] || "N/A";
          const hoster = parts[1] || "N/A";
          return {
            title: fullLinkTitle,
            url: linkUrl,
            quality: quality || "N/A",
            hoster: hoster || "N/A"
          };
        }).get()
      };
    } catch (error) {
      console.error(`Terjadi kesalahan saat mengambil tautan unduhan dari ${url}:`, error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url,
    ...rest
  } = req.method === "GET" ? req.query : req.body;
  const animesu = new AnimeScraper();
  try {
    switch (action) {
      case "search":
        if (query) {
          const searchResult = await animesu.search({
            query: query,
            ...rest
          });
          return res.status(200).json(searchResult);
        } else {
          return res.status(400).json({
            error: 'Paramenter "query" wajib ada untuk aksi "search".'
          });
        }
      case "detail":
        if (url) {
          const detailResult = await animesu.detail({
            url: url,
            ...rest
          });
          return res.status(200).json(detailResult);
        } else {
          return res.status(400).json({
            error: 'Paramenter "url" wajib ada untuk aksi "detail".'
          });
        }
      case "download":
        if (url) {
          const downloadResult = await animesu.download({
            url: url,
            ...rest
          });
          return res.status(200).json(downloadResult);
        } else {
          return res.status(400).json({
            error: 'Paramenter "url" wajib ada untuk aksi "download".'
          });
        }
      default:
        return res.status(400).json({
          error: 'Aksi tidak valid. Gunakan "search", "detail", atau "download".'
        });
    }
  } catch (error) {
    console.error("API Error:", error.message);
    return res.status(500).json({
      error: "Terjadi kesalahan internal server: " + error.message
    });
  }
}