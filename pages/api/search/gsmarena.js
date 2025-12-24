import axios from "axios";
import * as cheerio from "cheerio";
import CryptoJS from "crypto-js";
class GsmScraper {
  constructor() {
    this.base_url = "https://m.gsmarena.com";
    this.headers = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image:apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      Pragma: "no-cache",
      Referer: "https://m.gsmarena.com/",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  decrypt(data, key, iv) {
    try {
      const decrypted = CryptoJS.AES.decrypt({
        ciphertext: CryptoJS.enc.Base64.parse(data)
      }, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return decrypted.toString(CryptoJS.enc.Utf8) || null;
    } catch (e) {
      return null;
    }
  }
  snake_case(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_").replace(/^_|_$/g, "");
  }
  specsnake_case(data_spec_str) {
    if (!data_spec_str) return "";
    return data_spec_str.replace(/-hl$/, "").replace(/-/g, "_").toLowerCase();
  }
  clean_text(text) {
    if (typeof text !== "string") return "";
    return text.replace(/\s+/g, " ").trim();
  }
  async search({
    query,
    rest = {}
  }) {
    try {
      const res = await axios.get(`${this.base_url}/resl.php3?sSearch=${encodeURIComponent(query)}`, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(res.data);
      let found_key_str, found_iv_str, found_data_str;
      $("script").each((i, el) => {
        const s = $(el).html();
        if (s?.includes("DATA") && s?.includes("KEY") && s?.includes("IV")) {
          found_key_str = s.match(/const KEY\s*=\s*"([^"]+)"/)?.[1];
          found_iv_str = s.match(/const IV\s*=\s*"([^"]+)"/)?.[1];
          found_data_str = s.match(/const DATA\s*=\s*"([^"]+)"/)?.[1];
          return false;
        }
      });
      const decrypted_data = this.decrypt(found_data_str, CryptoJS.enc.Base64.parse(found_key_str || ""), CryptoJS.enc.Base64.parse(found_iv_str || ""));
      let parsed_results = {
        phones: [],
        reviews: [],
        news: []
      };
      if (decrypted_data) {
        const $dec = cheerio.load(decrypted_data);
        const fix_url = path => path ? `${this.base_url}${path.startsWith("/") ? path : `/${path}`}` : "#";
        parsed_results.phones = $dec(".swiper-half-slide").get().map(el => ({
          title: this.clean_text($dec(el).find("strong").text()) || "N/A",
          url: fix_url($dec(el).find("a").attr("href")),
          img: $dec(el).find("img").attr("src") || "N/A"
        }));
        parsed_results.reviews = $dec(".homepage-slide-review > a").get().map(el => ({
          title: this.clean_text($dec(el).find("h3").text()) || "N/A",
          url: fix_url($dec(el).attr("href")),
          img: $dec(el).find("img").attr("src") || "N/A"
        }));
        parsed_results.news = $dec(".homepage-news-list .homepage-slide > a").get().map(el => ({
          title: this.clean_text($dec(el).find("h3").text()) || "N/A",
          url: fix_url($dec(el).attr("href")),
          img: $dec(el).find("img").attr("src") || "N/A",
          date: this.clean_text($dec(el).find(".news-subh").text()) || "N/A"
        }));
      }
      return {
        result: parsed_results,
        error: null
      };
    } catch (e) {
      return {
        result: {
          phones: [],
          reviews: [],
          news: []
        },
        error: e.message
      };
    }
  }
  async detail({
    url,
    rest = {}
  }) {
    try {
      if (!url) throw new Error("URL is required for fetching details.");
      const res = await axios.get(url, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(res.data);
      const page_title = this.clean_text($("h1.section.nobor").text()) || "N/A";
      const image_url = $("#specs-cp-pic img").attr("src") || "N/A";
      const popularity_hits = this.clean_text($("#popularity-vote strong").text()) || "N/A";
      const fan_count = this.clean_text($("#fan-vote strong").text()) || "N/A";
      const full_specs = {};
      const quick_specs = {};
      const $quick_specs_container = $("#specs-cp .quick-specs-swiper .swiper-wrapper");
      $quick_specs_container.find("[data-spec]").each((i, el) => {
        const $el = $(el);
        const data_spec = $el.attr("data-spec");
        let text = this.clean_text($el.text());
        const key_name = this.specsnake_case(data_spec);
        if (data_spec === "battype-hl") {
          quick_specs.battery_charging = text.replace(/(wired-charging|wireless-charging)/gi, "").replace(/\s+/g, " ").trim();
        } else {
          quick_specs[key_name] = text;
        }
      });
      $("#specs-list table").each((i, table) => {
        const $table = $(table);
        const section_title = this.clean_text($table.find('th[scope="col"]').text());
        if (section_title) {
          const section_snake_case = this.snake_case(section_title);
          full_specs[section_snake_case] = {};
          $table.find("tr").each((j, row) => {
            const $row = $(row);
            if ($row.find('th[scope="col"]').length || !$row.children().length || $row.hasClass("collapse")) return;
            let title = this.clean_text($row.find(".ttl").text());
            const info = this.clean_text($row.find(".nfo").text());
            if (title === "" && info) {
              const prev_key = Object.keys(full_specs[section_snake_case]).pop();
              if (prev_key) {
                let current_value = full_specs[section_snake_case][prev_key];
                full_specs[section_snake_case][prev_key] = Array.isArray(current_value) ? [...current_value, info] : [current_value, info];
              }
            } else if (title && info) {
              const title_snake_case = this.snake_case(title);
              full_specs[section_snake_case][title_snake_case] = info;
            }
          });
        }
      });
      return {
        result: {
          title: page_title,
          image_url: image_url,
          quick_specs: quick_specs,
          popularity_hits: popularity_hits,
          fan_count: fan_count,
          full_specs: full_specs
        },
        error: null
      };
    } catch (e) {
      console.error(`Error fetching detail for ${url}:`, e.message);
      return {
        result: null,
        error: e.message
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
        action: "search | detail"
      }
    });
  }
  const scraper = new GsmScraper();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await scraper.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await scraper.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | detail`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}