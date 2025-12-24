import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
const uuidv4 = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0,
      v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
};
class JobstreetClient {
  constructor(options) {
    console.log("Proses: Menginisialisasi client...");
    this.config = {
      baseURL: options?.baseURL || "https://id.jobstreet.com",
      endpoints: {
        search: "/api/jobsearch/v5/search"
      },
      ...options
    };
    const cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: cookieJar,
      baseURL: this.config.baseURL,
      headers: this.buildHeader("default")
    }));
    this.sessionId = uuidv4();
    this.visitorId = uuidv4();
    console.log("Proses: Client berhasil dibuat.");
  }
  buildHeader(type = "default", additionalHeaders = {}) {
    const baseHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      priority: "u=1, i",
      referer: "https://id.jobstreet.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    const headerTypes = {
      default: {
        ...baseHeaders,
        "seek-request-brand": "jobstreet",
        "seek-request-country": "ID",
        "x-seek-site": "Chalice"
      },
      search: {
        ...baseHeaders,
        "seek-request-brand": "jobstreet",
        "seek-request-country": "ID",
        "x-seek-site": "Chalice"
      },
      html: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "accept-language": "id-ID,id;q=0.9,en;q=0.8",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    };
    return {
      ...headerTypes[type] || headerTypes.default,
      ...additionalHeaders
    };
  }
  async search({
    query,
    ...rest
  }) {
    console.log(`Proses: Memulai pencarian untuk query "${query}"...`);
    try {
      const page = rest?.page ? rest.page : 1;
      const pageSize = rest?.pageSize ?? 32;
      const params = {
        siteKey: "ID-Main",
        sourcesystem: "houston",
        page: page,
        keywords: query,
        pageSize: pageSize,
        include: "seodata,gptTargeting,relatedsearches",
        locale: "id-ID",
        source: "FE_HOME",
        relatedSearchesCount: 12,
        ...rest
      };
      console.log("Proses: Mengirim permintaan ke API pencarian dengan parameter:", params);
      const response = await this.client.get(this.config.endpoints.search, {
        params: params,
        headers: this.buildHeader("search")
      });
      const totalJobs = response.data?.total;
      const jobs = response.data?.data;
      console.log(`Proses: Permintaan pencarian berhasil. Ditemukan ${totalJobs || 0} pekerjaan.`);
      return jobs;
    } catch (error) {
      console.error("Proses: Terjadi kesalahan saat melakukan pencarian API. Mencoba fallback search...");
      console.error("Pesan Error:", error.message);
      return await this.fallbackSearch({
        query: query,
        ...rest
      });
    }
  }
  async fallbackSearch({
    query,
    ...rest
  }) {
    console.log(`Proses: Memulai fallback search untuk query "${query}" menggunakan HTML scraping...`);
    try {
      const url = `https://www.jobstreet.co.id/id/job-search/${encodeURIComponent(query)}-jobs/`;
      const response = await this.client.get(url, {
        headers: this.buildHeader("html")
      });
      const html = response.data;
      const $ = cheerio.load(html);
      const jobs = $("article").map((_, article) => {
        const $article = $(article);
        return {
          title: $article.find("h3 a").text().trim() || "Tidak diketahui",
          company: $article.find("span:contains('di')").next("a").text().trim() || "Tidak diketahui",
          location: $article.find("span[data-automation='jobCardLocation']").map((_, el) => $(el).text().trim()).get().join(", ") || "Tidak diketahui",
          detailLink: new URL($article.find("h3 a").attr("href"), url).href || "Tidak diketahui",
          uploadDate: $article.find("span[data-automation='jobListingDate']").text().trim() || "Tidak diketahui",
          salary: $article.find("span[data-automation='jobSalary']").text().trim() || "Tidak diketahui",
          jobType: $article.find("p:contains('Full time')").text().trim() || "Tidak diketahui",
          classification: $article.find("span:contains('classification:')").next("a").text().trim() || "Tidak diketahui",
          subClassification: $article.find("span:contains('subClassification:')").next("a").text().trim() || "Tidak diketahui",
          companyLogo: $article.find("img._1a0uxm90").attr("src") || "Tidak diketahui"
        };
      }).get();
      console.log(`Proses: Fallback search berhasil. Ditemukan ${jobs.length} pekerjaan.`);
      return jobs;
    } catch (error) {
      console.error("Proses: Fallback search juga gagal.");
      console.error("Pesan Error:", error.message);
      return null;
    }
  }
  async detail({
    id
  }) {
    console.log(`Proses: Memulai pengambilan detail untuk pekerjaan ID "${id}"...`);
    if (!id) {
      console.error("Proses: ID pekerjaan tidak valid.");
      return null;
    }
    try {
      const url = `https://id.jobstreet.com/id/job/${id}`;
      const response = await this.client.get(url, {
        headers: this.buildHeader("html")
      });
      const html = response.data;
      const $ = cheerio.load(html);
      const scriptContent = $('script[data-automation="server-state"]').html();
      if (!scriptContent) {
        console.error("Proses: Script dengan data server state tidak ditemukan.");
        return {};
      }
      const parts = scriptContent.split("window.SEEK_REDUX_DATA");
      if (parts.length < 2) {
        console.error("Proses: window.SEEK_REDUX_DATA tidak ditemukan dalam script.");
        return {};
      }
      const secondPart = parts[1].split("window.SEEK_APP_CONFIG")[0];
      const jsonObjects = this.extractJSON(secondPart);
      const result = jsonObjects.reduce((acc, obj) => {
        switch (obj.__typename) {
          case "JobTrackingClassificationInfo":
            acc.classification = obj.classification;
            acc.subClassification = obj.subClassification;
            break;
          case "JobTrackingLocationInfo":
            acc.location = obj.location;
            break;
          case "SeekDateTime":
            if (!acc.dateTimeUtc) acc.dateTimeUtc = obj.dateTimeUtc;
            break;
          case "JobSalary":
            acc.salary = obj.label;
            break;
          case "JobWorkTypes":
            acc.workType = obj.label;
            break;
          case "Advertiser":
            acc.company = obj.name;
            break;
          case "LocationInfo":
            acc.locationLabel = obj.label;
            break;
          case "ClassificationInfo":
            acc.classificationLabel = obj.label;
            break;
          case "JobProductBrandingImage":
            acc.imageUrls = (acc.imageUrls || []).concat(obj.url);
            break;
          case "JobQuestionnaire":
            acc.questions = obj.questions;
            break;
          case "Branding":
            acc.logoUrl = obj.logo;
            break;
          case "Description":
            acc.paragraphs = obj.paragraphs;
            break;
          case "CompanySize":
            acc.companySize = obj.description;
            break;
          case "Website":
            acc.website = obj.url;
            break;
          case "PerkAndBenefit":
            acc.perks = (acc.perks || []).concat(obj.title);
            break;
          case "GFJLocation":
            acc.country = obj.country;
            acc.state = obj.state;
            break;
          case "GFJWorkTypes":
            acc.workTypes = obj.label;
            break;
          default:
            if (obj.title && obj.landingPage) acc.title = obj.title;
        }
        return acc;
      }, {});
      console.log(`Proses: Detail pekerjaan berhasil diambil untuk ID "${id}".`);
      return result;
    } catch (error) {
      console.error("Proses: Terjadi kesalahan saat mengambil detail pekerjaan.");
      console.error("Pesan Error:", error.message);
      console.error("Status Kode:", error.response?.status || "Tidak ada respons");
      return {};
    }
  }
  extractJSON(str) {
    const regex = /{(?:[^{}]|(R))*}/g;
    const matches = str.match(regex) || [];
    return matches.map(match => {
      try {
        return JSON.parse(match);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
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
  const api = new JobstreetClient();
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
        if (!params.id) {
          return res.status(400).json({
            error: "Paramenter 'id' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search' dan 'detail'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}