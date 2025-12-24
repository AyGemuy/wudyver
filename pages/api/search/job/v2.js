import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class IndeedScraper {
  constructor() {
    this.baseURL = "https://id.indeed.com";
    this.proxyURL = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v13?url=`;
  }
  _getProxiedUrl(targetUrl) {
    return `${this.proxyURL}${encodeURIComponent(targetUrl)}`;
  }
  async search({
    query = "operator produksi",
    limit = 10
  }) {
    try {
      const targetUrl = new URL(`${this.baseURL}/m/jobs`);
      targetUrl.searchParams.append("q", query);
      targetUrl.searchParams.append("l", "");
      targetUrl.searchParams.append("from", "searchOnHP,whatOverlay,whatautocomplete,whatautocompleteSourceStandard");
      targetUrl.searchParams.append("sameL", "1");
      const requestUrl = this._getProxiedUrl(targetUrl.toString());
      console.log(`Mengambil data dari Indeed melalui proxy...`);
      const response = await axios.get(requestUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      const $ = cheerio.load(response.data);
      const jobs = [];
      $(".cardOutline.tapItem.result").each((index, element) => {
        if (jobs.length >= limit) return false;
        const $card = $(element);
        const job = this.parseJobCard($card, $);
        if (job) {
          jobs.push(job);
        }
      });
      console.log(`Berhasil mengambil ${jobs.length} lowongan pekerjaan`);
      return jobs;
    } catch (error) {
      console.error("Error dalam searchJobs:", error.message);
      throw error;
    }
  }
  parseJobCard($card, $) {
    try {
      const titleElement = $card.find(".jobTitle a");
      const jobTitle = titleElement.text().trim();
      const jobLink = titleElement.attr("href");
      const jobId = titleElement.attr("id")?.replace("job_", "") || titleElement.attr("data-jk");
      const companyName = $card.find('[data-testid="company-name"]').text().trim();
      const location = $card.find('[data-testid="text-location"]').text().trim();
      const salary = $card.find('.salary-snippet-container [data-testid="attribute_snippet_testid"]').text().trim();
      const snippet = $card.find('[data-testid="belowJobSnippet"]').text().trim();
      const easyApply = $card.find('[data-testid="indeedApply"]').length > 0;
      const job = {
        id: jobId,
        title: jobTitle,
        company: companyName,
        location: location,
        salary: salary || "Tidak disebutkan",
        snippet: snippet,
        easyApply: easyApply,
        url: jobLink ? `${this.baseURL}${jobLink}` : null,
        timestamp: new Date().toISOString()
      };
      Object.keys(job).forEach(key => {
        if (!job[key] && job[key] !== false) {
          job[key] = "Tidak disebutkan";
        }
      });
      return job;
    } catch (error) {
      console.error("Error parsing job card:", error.message);
      return null;
    }
  }
  async detail({
    id: jobId
  }) {
    try {
      const targetUrl = new URL(`${this.baseURL}/m/viewjob`);
      targetUrl.searchParams.append("jk", jobId);
      const requestUrl = this._getProxiedUrl(targetUrl.toString());
      console.log(`Mengambil detail pekerjaan: ${jobId}`);
      const response = await axios.get(requestUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      const initialData = this.extractInitialData(response.data);
      if (initialData) {
        return this.parseJobDetails(initialData, jobId);
      } else {
        console.log("Fallback: Parsing detail pekerjaan dari HTML biasa...");
        return this.parseJobDetailsFromHTML(response.data, jobId);
      }
    } catch (error) {
      console.error("Error dalam getJobDetails:", error.message);
      throw error;
    }
  }
  extractInitialData(html) {
    try {
      const match = html.match(/window\._initialData\s*=\s*(\{.*\});/);
      if (match && match[1]) {
        const jsonStr = match[1];
        return JSON.parse(jsonStr);
      }
      console.log("window._initialData tidak ditemukan di dalam HTML.");
      return null;
    } catch (error) {
      console.error("Error saat mengekstrak atau parsing initial data:", error.message);
      return null;
    }
  }
  parseJobDetails(initialData, jobId) {
    try {
      const jobData = initialData?.hostQueryExecutionResult?.data?.jobData?.results?.[0]?.job;
      if (!jobData) {
        throw new Error("Data pekerjaan tidak ditemukan di dalam initial data");
      }
      const description = jobData.description?.html || jobData.description?.text || "";
      const descriptionText = jobData.description?.text || "";
      return {
        id: jobId,
        title: jobData.title,
        company: jobData.sourceEmployerName,
        location: jobData.location?.formatted?.long || jobData.location?.fullAddress,
        description: description,
        datePublished: jobData.datePublished ? new Date(jobData.datePublished).toLocaleDateString("id-ID") : "Tidak disebutkan",
        employmentType: this.extractEmploymentType(descriptionText),
        requirements: this.extractRequirements(descriptionText),
        responsibilities: this.extractResponsibilities(descriptionText),
        salary: "Tidak disebutkan",
        indeedApply: !!jobData.indeedApply,
        expired: jobData.expired,
        url: jobData.url
      };
    } catch (error) {
      console.error("Error parsing job details:", error.message);
      throw error;
    }
  }
  parseJobDetailsFromHTML(html, jobId) {
    const $ = cheerio.load(html);
    const description = $("#jobDescriptionText").text().trim() || $('[data-testid="jobDescriptionText"]').text().trim();
    return {
      id: jobId,
      title: $("h1").first().text().trim(),
      company: $('[data-testid="inlineHeader-companyName"]').text().trim(),
      location: $('[data-testid="inlineHeader-companyLocation"]').text().trim(),
      description: description,
      datePublished: "Tidak disebutkan",
      employmentType: this.extractEmploymentType(description),
      requirements: this.extractRequirements(description),
      responsibilities: this.extractResponsibilities(description),
      salary: "Tidak disebutkan",
      indeedApply: html.includes("indeedApply") || html.includes("Lamar dengan mudah"),
      expired: false
    };
  }
  extractEmploymentType(description) {
    if (!description) return [];
    const types = new Set();
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes("penuh waktu") || lowerDesc.includes("full time")) types.add("Penuh Waktu");
    if (lowerDesc.includes("paruh waktu") || lowerDesc.includes("part time")) types.add("Paruh Waktu");
    if (lowerDesc.includes("kontrak")) types.add("Kontrak");
    if (lowerDesc.includes("magang")) types.add("Magang");
    if (lowerDesc.includes("fresh grad")) types.add("Fresh Graduate");
    return types.size > 0 ? Array.from(types) : ["Tidak disebutkan"];
  }
  extractRequirements(description) {
    if (!description) return [];
    const requirements = [];
    const reqSection = description.match(/(syarat|kualifikasi|requirements)[\s\S]*/i);
    const textToSearch = reqSection ? reqSection[0] : description;
    const lines = textToSearch.split("\n");
    lines.forEach(line => {
      const cleanLine = line.trim();
      if (cleanLine.match(/^(\d+\.|-|\*|•)/) && cleanLine.length > 5) {
        requirements.push(cleanLine.replace(/^(\d+\.|-|\*|•)\s*/, ""));
      }
    });
    return requirements.length > 0 ? requirements : ["Tidak disebutkan"];
  }
  extractResponsibilities(description) {
    if (!description) return [];
    const responsibilities = [];
    const respSection = description.match(/(tanggung jawab|responsibility|tugas)[\s\S]*/i);
    const textToSearch = respSection ? respSection[0] : description;
    const lines = textToSearch.split("\n");
    lines.forEach(line => {
      const cleanLine = line.trim();
      if (cleanLine.match(/^(\d+\.|-|\*|•)/) && cleanLine.length > 10) {
        responsibilities.push(cleanLine.replace(/^(\d+\.|-|\*|•)\s*/, ""));
      }
    });
    return responsibilities.length > 0 ? responsibilities : ["Tidak disebutkan"];
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
  const api = new IndeedScraper();
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