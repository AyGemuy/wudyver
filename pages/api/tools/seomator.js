import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  URLSearchParams
} from "url";
class SeoScraper {
  constructor() {
    this.tl = null;
    this.tlForList = null;
    this.initialized = false;
    const jar = new CookieJar();
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=0, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.client = wrapper(axios.create({
      jar: jar,
      headers: this.headers
    }));
  }
  async init(site) {
    if (this.initialized) return this.tl;
    try {
      console.log(`Initializing with site: ${site}`);
      const url = `https://free-seo-tools.seomator.com/tools.php?site=${encodeURIComponent(site)}`;
      const res = await this.client.get(url);
      const $ = cheerio.load(res?.data || "");
      const categories = {};
      const categoriesForList = {};
      $("div.category").each((i, cat) => {
        const title = $(cat).find("div.title h2").text()?.trim() || "Unknown";
        const categoryKey = title.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        categories[title] = [];
        categoriesForList[categoryKey] = [];
        $(cat).find("div.tools a.tool").each((j, tool) => {
          const href = $(tool).attr("href") || "";
          const id = new URLSearchParams(href.split("?")[1] || "").get("id") || "";
          const name = $(tool).find("span").text()?.trim() || "";
          if (id && name) {
            const tool_name = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
            categories[title].push({
              id: id,
              tool_name: tool_name,
              original_name: name
            });
            categoriesForList[categoryKey].push({
              id: id,
              original_name: name
            });
          }
        });
      });
      this.tl = categories;
      this.tlForList = categoriesForList;
      this.initialized = true;
      console.log("Initialized successfully with tools list");
      return categoriesForList;
    } catch (e) {
      console.log("Error initializing:", e?.message || e);
      throw e;
    }
  }
  pt($, el) {
    const data = [];
    const headers = [];
    const thead = $(el).find("thead");
    const hasThead = thead.length > 0;
    if (hasThead) {
      thead.find("tr th").each((i, th) => {
        headers.push($(th).text()?.trim() || `col${i + 1}`);
      });
    } else {
      const firstTr = $(el).find("tr").first();
      firstTr.find("th, td").each((i, cell) => {
        headers.push($(cell).text()?.trim() || `col${i + 1}`);
      });
    }
    const bodyRows = $(el).find("tbody tr") || $(el).find("tr");
    const rows = hasThead ? bodyRows : bodyRows.slice(1);
    rows.each((i, tr) => {
      const row = {};
      $(tr).find("td, th").each((j, cell) => {
        let val = $(cell).text()?.trim().replace(/\s+/g, " ") || "";
        const cv = $(cell).find(".colored-value .value").text()?.trim() || "";
        val = cv || val;
        const ell = $(cell).find(".ellipsis").text()?.trim() || "";
        val = ell || val;
        const key = headers[j];
        row[key] = val;
      });
      if (Object.keys(row).length > 0) {
        data.push(row);
      }
    });
    return {
      id: $(el).attr("id") || "",
      data: data
    };
  }
  async generate({
    url: site,
    tools: id = "sitemap",
    ...rest
  } = {}) {
    if (!site) {
      throw new Error('Paramenter "url" (site) is required');
    }
    const listForOutput = await this.init(site);
    id = id?.trim() || "";
    if (!id) {
      return listForOutput;
    }
    let found = false;
    let tool_name = "";
    for (const cat in this.tl) {
      const tool = this.tl[cat].find(t => t.id === id);
      if (tool) {
        found = true;
        tool_name = tool.original_name;
        console.log(`Tool found: ${tool_name} (${id})`);
        break;
      }
    }
    if (!found) {
      console.log(`Tool "${id}" not found`);
      return listForOutput;
    }
    try {
      console.log(`Fetching tool: ${tool_name} for site: ${site}`);
      let url = `https://free-seo-tools.seomator.com/tool.php?id=${id}`;
      let config = {
        headers: {
          referer: `https://free-seo-tools.seomator.com/tools.php?site=${encodeURIComponent(site)}`
        }
      };
      let res = await this.client.get(url, config);
      let $ = cheerio.load(res?.data || "");
      let hasForm = $("form").length > 0;
      if (hasForm && Object.keys(rest).length > 0) {
        console.log(`Posting data to ${tool_name}`);
        config.headers["content-type"] = "application/x-www-form-urlencoded";
        config.headers.origin = "https://free-seo-tools.seomator.com";
        config.headers.referer = url;
        const postData = {
          ...rest
        };
        res = await this.client.post(url, new URLSearchParams(postData), config);
        $ = cheerio.load(res?.data || "");
      } else if (hasForm) {
        console.log(`Posting site url to ${tool_name}`);
        config.headers["content-type"] = "application/x-www-form-urlencoded";
        config.headers.origin = "https://free-seo-tools.seomator.com";
        config.headers.referer = url;
        res = await this.client.post(url, new URLSearchParams({
          url: site
        }), config);
        $ = cheerio.load(res?.data || "");
      }
      console.log("Parsing tables");
      const tables = [];
      $("div.table-container, table").each((i, cont) => {
        const h2 = $(cont).find("h2").text()?.trim() || "";
        const tableEl = $(cont).is("table") ? cont : $(cont).find("table")[0];
        if (tableEl) {
          const parsed = this.pt($, tableEl);
          tables.push({
            title: h2 || parsed.id || `Table ${i + 1}`,
            data: parsed.data
          });
        }
      });
      return tables;
    } catch (e) {
      console.log("Error:", e?.message || e);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "url are required"
    });
  }
  try {
    const client = new ChatZAI();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}