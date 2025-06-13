import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class JagokataScraper {
  constructor() {
    this.jar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      jar: this.jar
    }));
    this.baseUrl = "https://jagokata.com/";
  }
  async search({
    query = "cinta",
    limit = 5
  } = {}) {
    const url = `${this.baseUrl}kata-bijak/cari.html`;
    const headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "max-age=0",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://jagokata.com",
      priority: "u=0, i",
      referer: "https://jagokata.com/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
    const data = `citaat=${encodeURIComponent(query)}&zoekbutton=Zoeken`;
    try {
      const response = await this.axiosInstance.post(url, data, {
        headers: headers
      });
      const $ = cheerio.load(response.data);
      const images = $("#images-container ul li").get().map(el => {
        const img = $(el).find("img");
        const a = $(el).find("a");
        return {
          src: img.attr("data-src") || img.attr("src"),
          alt: img.attr("alt"),
          link: this.baseUrl + a.attr("href"),
          imageId: img.attr("data-imageid")
        };
      });
      const quotesRaw = $("#citatenrijen li:not(.googleinpage)").get().map(el => {
        const quoteLinkEl = $(el).find(".quotehref, .images-container .quotehref");
        const authorEl = $(el).find(".citatenlijst-auteur .auteurfbnaam");
        const sourceEl = $(el).find(".bron-citaat a");
        const votesEl = $(el).find(".votes-content span");
        return {
          id: $(el).attr("id")?.replace("q", ""),
          quote: $(el).find("q.fbquote").text().trim(),
          author: {
            name: authorEl.find("em").text().trim(),
            description: $(el).find(".citatenlijst-auteur .auteur-beschrijving").text().trim(),
            bornDied: $(el).find(".citatenlijst-auteur .auteur-gebsterf").text().trim(),
            profileLink: this.baseUrl + (authorEl.attr("href") || "")
          },
          source: sourceEl.length ? {
            title: sourceEl.text().trim(),
            link: this.baseUrl + (sourceEl.attr("href") || "")
          } : null,
          votes: votesEl.attr("title") ? parseInt(votesEl.attr("title").replace(/\D/g, ""), 10) : null,
          detailLink: quoteLinkEl.attr("href") ? this.baseUrl + quoteLinkEl.attr("href") : null,
          detail: {}
        };
      });
      const detailedQuotes = [];
      for (const [eq, quote] of quotesRaw.entries()) {
        if (eq >= limit) break;
        if (quote.detailLink) {
          try {
            const detailResponse = await this.axiosInstance.get(quote.detailLink);
            const $detail = cheerio.load(detailResponse.data);
            const detailVotesEl = $detail("#votes" + quote.id + " .votes-positive");
            const detailAuthorEl = $detail("#content-container .citatenlijst-auteur .auteurfbnaam");
            const detailQuoteImageEl = $detail("#quote-image");
            quote.detail = {
              fullQuote: $detail("#content-container q.fbquote").text().trim(),
              author: {
                name: detailAuthorEl.find("em").text().trim(),
                description: $detail("#content-container .citatenlijst-auteur .auteur-beschrijving").text().trim(),
                bornDied: $detail("#content-container .citatenlijst-auteur .auteur-gebsterf").text().trim()
              },
              quoteImage: detailQuoteImageEl.attr("data-src") ? this.baseUrl + detailQuoteImageEl.attr("data-src") : null,
              quoteImageAlt: detailQuoteImageEl.attr("alt"),
              votes: detailVotesEl.text().trim() ? parseInt(detailVotesEl.text().trim().replace(/\D/g, ""), 10) : null
            };
          } catch (detailError) {
            console.error(`Gagal mengambil detail untuk ${quote.detailLink}:`, detailError.message);
          }
        }
        detailedQuotes.push(quote);
      }
      return {
        images: images,
        quotes: detailedQuotes
      };
    } catch (error) {
      console.error("Terjadi kesalahan saat pencarian:", error.message);
      throw error;
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
    const scraper = new JagokataScraper();
    const response = await scraper.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}